import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { CreateEscalationDto } from '../../stewardship/escalations/dto/create-escalation.dto';
import { EscalationResponseDto } from '../../stewardship/escalations/dto/escalation-response.dto';
import {
  IStewardshipEscalationRepository,
  STEWARDSHIP_ESCALATION_REPOSITORY,
} from '../../stewardship/escalations/repositories/stewardship-escalation.repository.interface';

/**
 * Reuses StewardshipEscalation directly (§4, §6) rather than a parallel
 * system. Authorization lives here, not in Stewardship, because it depends
 * on Pod membership: every escalation is a confidential request for
 * additional stewardship, never an accusation. Any ACTIVE Pod member — not
 * only the Steward — may raise one, so a concern about a Steward's own
 * conduct is never filterable by that Steward (Founder Decision #4).
 */
@Injectable()
export class PodEscalationsService {
  constructor(
    @Inject(STEWARDSHIP_ESCALATION_REPOSITORY) private readonly repo: IStewardshipEscalationRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  async create(podId: string, dto: CreateEscalationDto, caller: AuthenticatedUser): Promise<EscalationResponseDto> {
    await this.auth.assertActiveMemberOrAdmin(podId, caller);
    const escalation = await this.repo.create({
      podId, title: dto.title, description: dto.description, severity: dto.severity, raisedById: caller.id,
    });
    return EscalationResponseDto.fromEntity(escalation);
  }

  /** Steward/Admin only — never the member concerned, and not exposed to the general membership. */
  async findForPod(podId: string, caller: AuthenticatedUser): Promise<EscalationResponseDto[]> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    const escalations = await this.repo.findByPod(podId);
    return escalations.map(EscalationResponseDto.fromEntity);
  }
}
