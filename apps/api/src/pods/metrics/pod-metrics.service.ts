import { Inject, Injectable } from '@nestjs/common';
import { ServiceProjectStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { PodMetricsResponseDto } from './dto/pod-metrics-response.dto';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { IPodEventRepository, POD_EVENT_REPOSITORY } from '../events/repositories/pod-event.repository.interface';
import { IPodServiceProjectRepository, POD_SERVICE_PROJECT_REPOSITORY } from '../service-projects/repositories/pod-service-project.repository.interface';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Computed on read, at the Pod level, never persisted per-member (§1.10,
 * §6). This is the sole data surface AI-generated Institutional Wisdom
 * (§7.2) is permitted to consume — no other Pod data is exposed to the AI
 * Engine. Steward (own Pod) or Admin only.
 */
@Injectable()
export class PodMetricsService {
  constructor(
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
    @Inject(POD_EVENT_REPOSITORY) private readonly eventRepo: IPodEventRepository,
    @Inject(POD_SERVICE_PROJECT_REPOSITORY) private readonly serviceProjectRepo: IPodServiceProjectRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  async getForPod(podId: string, caller: AuthenticatedUser): Promise<PodMetricsResponseDto> {
    await this.auth.assertStewardOrAdmin(podId, caller);
    return this.compute(podId);
  }

  /** Internal, unauthenticated read for AI Institutional Wisdom aggregation (§7.2) — the caller enforces its own authorization. */
  async computeRaw(podId: string): Promise<PodMetricsResponseDto> {
    return this.compute(podId);
  }

  private async compute(podId: string): Promise<PodMetricsResponseDto> {
    const [activeMemberCount, attendance, serviceProjectCount, serviceProjectsCompleted, eventsHeldLast90Days] = await Promise.all([
      this.membershipRepo.countActiveForPod(podId),
      this.eventRepo.countAttendanceForPod(podId),
      this.serviceProjectRepo.countForPod(podId),
      this.serviceProjectRepo.countByPodAndStatus(podId, ServiceProjectStatus.COMPLETED),
      this.eventRepo.countHeldSince(podId, new Date(Date.now() - NINETY_DAYS_MS)),
    ]);

    return {
      podId,
      activeMemberCount,
      attendanceRatePercent: attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : null,
      serviceProjectCount,
      serviceProjectsCompleted,
      eventsHeldLast90Days,
      generatedAt: new Date(),
    };
  }
}
