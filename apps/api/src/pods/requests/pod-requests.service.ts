import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PodMembershipOrigin, PodMembershipStatus, PodRequestStatus, PodRequestType, PodType } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { CreateRequestDto, DecideRequestDto, RequestResponseDto } from './dto/request.dto';
import { IPodRequestRepository, POD_REQUEST_REPOSITORY } from './repositories/pod-request.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';

/**
 * PodRequest is always reviewed, never silently auto-applied — the
 * Pods-domain equivalent of StewardshipRelationship's requestSteward() (§1.8)
 * — with one deliberate exception: LEAVE resolves immediately, because
 * "Belonging shall never become imprisonment" (Article VIII) means leaving
 * requires no one's permission.
 */
@Injectable()
export class PodRequestsService {
  constructor(
    @Inject(POD_REQUEST_REPOSITORY) private readonly repo: IPodRequestRepository,
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
    @Inject(POD_REPOSITORY) private readonly podRepo: IPodRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  async create(dto: CreateRequestDto, caller: AuthenticatedUser): Promise<RequestResponseDto> {
    if (dto.type === PodRequestType.PROPOSE_NEW_POD) {
      if (!dto.proposedPodName || !dto.proposedPodDescription) {
        throw new BadRequestException('proposedPodName and proposedPodDescription are required for PROPOSE_NEW_POD');
      }
    } else if (!dto.podId) {
      throw new BadRequestException(`podId is required for ${dto.type}`);
    }

    if (dto.type === PodRequestType.LEAVE) {
      const membership = await this.membershipRepo.findActiveForPodAndUser(dto.podId!, caller.id);
      if (!membership) throw new NotFoundException('You do not have an active membership in this Pod');
      await this.membershipRepo.update(membership.id, { status: PodMembershipStatus.ENDED, endedAt: new Date(), endReason: 'MEMBER_LEFT' });
      const request = await this.repo.create({
        userId: caller.id, type: dto.type, podId: dto.podId, reason: dto.reason,
        status: PodRequestStatus.APPROVED, decidedAt: new Date(),
      });
      return RequestResponseDto.fromEntity(request);
    }

    const request = await this.repo.create({
      userId: caller.id, type: dto.type, podId: dto.podId,
      proposedPodName: dto.proposedPodName, proposedPodDescription: dto.proposedPodDescription, reason: dto.reason,
    });
    return RequestResponseDto.fromEntity(request);
  }

  async findMine(caller: AuthenticatedUser): Promise<RequestResponseDto[]> {
    const result = await this.repo.findAll({ page: 1, limit: 100, userId: caller.id });
    return result.data.map(RequestResponseDto.fromEntity);
  }

  /** Pending requests targeting this Pod — this Pod's Steward or Admin. */
  async findForPod(podId: string, caller: AuthenticatedUser): Promise<RequestResponseDto[]> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const result = await this.repo.findAll({ page: 1, limit: 100, podId, status: PodRequestStatus.PENDING });
    return result.data.map(RequestResponseDto.fromEntity);
  }

  async withdraw(id: string, caller: AuthenticatedUser): Promise<RequestResponseDto> {
    const request = await this.getOrThrow(id);
    if (request.userId !== caller.id) throw new ForbiddenException('You may only withdraw your own request');
    if (request.status !== PodRequestStatus.PENDING) throw new ConflictException(`Request is '${request.status}' and can no longer be withdrawn`);
    const updated = await this.repo.update(id, { status: PodRequestStatus.WITHDRAWN });
    return RequestResponseDto.fromEntity(updated);
  }

  async decide(id: string, dto: DecideRequestDto, caller: AuthenticatedUser): Promise<RequestResponseDto> {
    const request = await this.getOrThrow(id);
    if (request.status !== PodRequestStatus.PENDING) {
      throw new ConflictException(`Request is '${request.status}' and has already been decided`);
    }

    if (request.type === PodRequestType.PROPOSE_NEW_POD) {
      if (!this.auth.isAdmin(caller)) throw new ForbiddenException('Only an Administrator may decide a new-Pod proposal');
    } else {
      await this.auth.assertStewardOrAdmin(request.podId!, caller);
    }

    if (!dto.approve) {
      const updated = await this.repo.update(id, { status: PodRequestStatus.DECLINED, decidedById: caller.id, decidedAt: new Date() });
      return RequestResponseDto.fromEntity(updated);
    }

    if (request.type === PodRequestType.JOIN) {
      await this.approveJoin(request.podId!, request.userId);
    } else if (request.type === PodRequestType.REASSIGNMENT) {
      await this.approveReassignment(request.podId!, request.userId);
    } else if (request.type === PodRequestType.PROPOSE_NEW_POD) {
      const pod = await this.createProposedPod(request);
      const updated = await this.repo.update(id, { status: PodRequestStatus.APPROVED, podId: pod.id, decidedById: caller.id, decidedAt: new Date() });
      return RequestResponseDto.fromEntity(updated);
    }

    const updated = await this.repo.update(id, { status: PodRequestStatus.APPROVED, decidedById: caller.id, decidedAt: new Date() });
    return RequestResponseDto.fromEntity(updated);
  }

  private async approveJoin(podId: string, userId: string): Promise<void> {
    const pending = await this.membershipRepo.findPendingForPodAndUser(podId, userId);
    if (pending) {
      await this.membershipRepo.update(pending.id, { status: PodMembershipStatus.ACTIVE, joinedAt: new Date() });
      return;
    }
    await this.membershipRepo.create({
      podId, userId, origin: PodMembershipOrigin.MEMBER_REQUEST, status: PodMembershipStatus.ACTIVE, joinedAt: new Date(),
    });
  }

  private async approveReassignment(newPodId: string, userId: string): Promise<void> {
    const currentMemberships = await this.membershipRepo.findAll({ page: 1, limit: 50, userId, status: PodMembershipStatus.ACTIVE });
    for (const m of currentMemberships.data) {
      await this.membershipRepo.update(m.id, { status: PodMembershipStatus.ENDED, endedAt: new Date(), endReason: 'REASSIGNMENT' });
    }
    await this.membershipRepo.create({
      podId: newPodId, userId, origin: PodMembershipOrigin.MEMBER_REQUEST, status: PodMembershipStatus.ACTIVE, joinedAt: new Date(),
    });
  }

  private async createProposedPod(request: { userId: string; proposedPodName: string | null; proposedPodDescription: string | null }) {
    const pod = await this.podRepo.create({
      name: request.proposedPodName!,
      shortDescription: request.proposedPodDescription!.slice(0, 200),
      fullDescription: request.proposedPodDescription!,
      type: PodType.INTEREST,
      createdById: request.userId,
    });
    const podRef = `AUR-POD-${pod.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.podRepo.setRef(pod.id, podRef);
    // The proposer is not automatically the Steward — Institutional Appointment applies to every Pod's first Steward (Founder Decision #2).
    await this.membershipRepo.create({
      podId: updated.id, userId: request.userId, origin: PodMembershipOrigin.MEMBER_REQUEST,
      status: PodMembershipStatus.ACTIVE, joinedAt: new Date(),
    });
    return updated;
  }

  private async getOrThrow(id: string) {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundException(`Pod request '${id}' not found`);
    return request;
  }
}
