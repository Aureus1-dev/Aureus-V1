import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernedWorkForm,
  GovernedWorkSourceType,
  GovernedWorkStakeType,
  Prisma,
  ResponsibilityContextType,
  ResponsibilityWorkContract,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyService } from './family.service';

export interface GovernedWorkContractInput {
  workForm: GovernedWorkForm;
  sourceType: GovernedWorkSourceType;
  sourceUserId?: string | null;
  stakeTypes: GovernedWorkStakeType[];
  doneMeans: Prisma.InputJsonValue;
  principalCarries: Prisma.InputJsonValue;
  aureusCarries: Prisma.InputJsonValue;
  togetherCarries: Prisma.InputJsonValue;
  humanRequired: Prisma.InputJsonValue;
  expectedEvidence: Prisma.InputJsonValue;
  assistanceBoundary: Prisma.InputJsonValue;
  verificationPolicyVersion: string;
  workTemplateKey: string;
  difficultyKey?: string | null;
}

@Injectable()
export class WorkContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly family: FamilyService,
  ) {}

  async createInitial(
    responsibilityId: string,
    guardianUserId: string,
    childUserId: string,
    input: GovernedWorkContractInput,
  ): Promise<ResponsibilityWorkContract> {
    await this.requireGuardianAuthorityForResponsibility(
      responsibilityId,
      guardianUserId,
      childUserId,
    );
    this.validateContractInput(input);

    const existing = await this.prisma.db.responsibilityWorkContract.findUnique({
      where: { responsibilityId_version: { responsibilityId, version: 1 } },
    });
    if (existing) return existing;

    return this.prisma.db.responsibilityWorkContract.create({
      data: {
        responsibilityId,
        version: 1,
        ...input,
        sourceUserId: input.sourceUserId ?? null,
        difficultyKey: input.difficultyKey ?? null,
        createdByUserId: guardianUserId,
        changeReason: null,
      },
    });
  }

  async createRenegotiatedVersion(
    responsibilityId: string,
    guardianUserId: string,
    childUserId: string,
    changeReason: string,
    next: GovernedWorkContractInput,
  ): Promise<ResponsibilityWorkContract> {
    await this.requireGuardianAuthorityForResponsibility(
      responsibilityId,
      guardianUserId,
      childUserId,
    );
    this.validateContractInput(next);
    if (!changeReason.trim()) {
      throw new BadRequestException('Renegotiation requires an explicit change reason');
    }

    const current = await this.prisma.db.responsibilityWorkContract.findFirst({
      where: { responsibilityId },
      orderBy: { version: 'desc' },
    });
    if (!current) throw new NotFoundException('Work contract not found');

    return this.prisma.db.responsibilityWorkContract.create({
      data: {
        responsibilityId,
        version: current.version + 1,
        ...next,
        sourceUserId: next.sourceUserId ?? null,
        difficultyKey: next.difficultyKey ?? null,
        createdByUserId: guardianUserId,
        changeReason: changeReason.trim(),
      },
    });
  }

  async findCurrent(responsibilityId: string): Promise<ResponsibilityWorkContract | null> {
    return this.prisma.db.responsibilityWorkContract.findFirst({
      where: { responsibilityId },
      orderBy: { version: 'desc' },
    });
  }

  private async requireGuardianAuthorityForResponsibility(
    responsibilityId: string,
    guardianUserId: string,
    childUserId: string,
  ): Promise<void> {
    await this.family.requireActiveRelationship(guardianUserId, childUserId);
    const responsibility = await this.prisma.db.responsibility.findFirst({
      where: {
        id: responsibilityId,
        contextType: ResponsibilityContextType.PERSONAL,
        principalUserId: childUserId,
      },
      select: { id: true },
    });
    if (!responsibility) {
      throw new NotFoundException('Child-owned personal Responsibility not found');
    }
  }

  private validateContractInput(input: GovernedWorkContractInput): void {
    if (input.stakeTypes.length === 0) {
      throw new BadRequestException('Tracked work requires at least one genuine stake');
    }
    if (!input.workTemplateKey.trim() || !input.verificationPolicyVersion.trim()) {
      throw new BadRequestException('Work template and verification policy are required');
    }
  }
}
