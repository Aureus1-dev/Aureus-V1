import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiCapability, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PodsService } from '../../pods/pods.service';
import { PodMetricsService } from '../../pods/metrics/pod-metrics.service';
import { buildPodInstitutionalWisdomPrompt, buildPodStewardInsightPrompt } from '../prompts/system-prompts.util';
import { AiRequestsService } from '../requests/ai-requests.service';
import { InsightResponseDto } from '../insights/dto/insight-response.dto';

const MIN_PODS_FOR_INSTITUTIONAL_WISDOM = 5;
const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

/**
 * Institutional Wisdom (WO-030 §7.2, Founder Decision #6) — the AI Engine
 * never monitors members. Every call here is human-triggered, reads only
 * the Pod-level aggregate metrics PodMetricsService already computes (never
 * message content, individual RSVP/attendance, or faithPreference), and is
 * logged through the same AiRequestsService.runCompletion() single-call
 * path every other AI capability uses.
 */
@Injectable()
export class PodInsightsService {
  constructor(
    private readonly podsService: PodsService,
    private readonly podMetrics: PodMetricsService,
    private readonly aiRequests: AiRequestsService,
  ) {}

  /** A Pod Steward requesting insight about their own Pod (Founder Decision #6) — PodMetricsService.getForPod enforces Steward-of-pod/Admin. */
  async generateForPod(podId: string, caller: AuthenticatedUser): Promise<InsightResponseDto> {
    const metrics = await this.podMetrics.getForPod(podId, caller);
    const prompt = buildPodStewardInsightPrompt(metrics);

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.POD_INSIGHT,
      messages: [{ role: 'user', content: prompt }],
    });

    return { content, requestId };
  }

  /**
   * Platform-wide, cross-Pod pattern report for Article X's Institutional
   * Wisdom — Admin-only. A minimum-Pod-count threshold (k-anonymity-style
   * discipline) applies before any cross-Pod aggregate is generated, so no
   * observation can be traced back to a single Pod's identity.
   */
  async generatePlatformWide(caller: AuthenticatedUser): Promise<InsightResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES as unknown as never[])) {
      throw new ForbiddenException('Only an Administrator may request platform-wide Institutional Wisdom');
    }

    const { data: pods } = await this.podsService.findAll({ page: 1, limit: 100 });
    if (pods.length < MIN_PODS_FOR_INSTITUTIONAL_WISDOM) {
      throw new ForbiddenException(`At least ${MIN_PODS_FOR_INSTITUTIONAL_WISDOM} active Pods are required before a cross-Pod pattern report can be generated`);
    }

    const metrics = await Promise.all(pods.map((p) => this.podMetrics.computeRaw(p.id)));
    const prompt = buildPodInstitutionalWisdomPrompt(metrics);

    const { content, requestId } = await this.aiRequests.runCompletion({
      userId: caller.id,
      capability: AiCapability.POD_INSIGHT,
      messages: [{ role: 'user', content: prompt }],
    });

    return { content, requestId };
  }
}
