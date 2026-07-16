import { Inject, Injectable } from '@nestjs/common';
import { Pod, PodStatus, PodType } from '@prisma/client';
import { IPodRepository, POD_REPOSITORY } from '../repositories/pod.repository.interface';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';
import { IProfileRepository, PROFILE_REPOSITORY } from '../../users/profile/repositories/profile.repository.interface';

export interface PodMatchCandidate {
  pod: Pod;
  score: number;
}

/**
 * The deterministic Pod-matching scoring function (WO-030 §2.3). Explicitly
 * not an ML model — ordinary, testable application code, mirroring
 * ADR-015 Decision 4's "tool orchestration means deterministic cross-service
 * calls, not an LLM-driven agent loop." Proximity dominates; secondary
 * Profile signals are additive. Never assigns — every caller of this
 * service is responsible for landing its result as a PENDING suggestion,
 * never an immediately-ACTIVE membership (§2.3, Founder Decision #1).
 */
@Injectable()
export class PodMatchingService {
  constructor(
    @Inject(POD_REPOSITORY) private readonly podRepo: IPodRepository,
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
    @Inject(PROFILE_REPOSITORY) private readonly profileRepo: IProfileRepository,
  ) {}

  async rankCandidates(userId: string, type: PodType, limit = 10): Promise<PodMatchCandidate[]> {
    const profile = await this.profileRepo.findByUserId(userId);
    const { data: pods } = await this.podRepo.findAll({ page: 1, limit: 200, type, status: PodStatus.ACTIVE });

    const existingMemberships = await this.membershipRepo.findAll({ page: 1, limit: 200, userId });
    const existingPodIds = new Set(
      existingMemberships.data
        .filter((m) => m.status === 'ACTIVE' || m.status === 'PENDING')
        .map((m) => m.podId),
    );

    const scored = pods
      .filter((pod) => !existingPodIds.has(pod.id))
      .map((pod) => ({ pod, score: this.score(pod, profile) }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Proximity dominant (city > region > state/province > country > no
   * match), secondary signals additive. A Pod or member with no location
   * signal at all still scores a small baseline so an otherwise-good match
   * is never entirely excluded for lacking optional data (Founder Decision
   * #7 — location fields are optional; absence must never read as a penalty
   * on the member).
   */
  private score(
    pod: Pod,
    profile: {
      city?: string | null; region?: string | null; stateProvince?: string | null; country?: string | null;
      profession?: string | null; preferredLanguage?: string | null; seasonOfLife?: string | null;
    } | null,
  ): number {
    let score = 1;
    if (!profile) return score;

    if (pod.city && profile.city && this.eq(pod.city, profile.city)) score += 8;
    else if (pod.region && profile.region && this.eq(pod.region, profile.region)) score += 5;
    else if (pod.stateProvince && profile.stateProvince && this.eq(pod.stateProvince, profile.stateProvince)) score += 3;
    else if (pod.country && profile.country && this.eq(pod.country, profile.country)) score += 1;

    if (pod.primaryLanguage && profile.preferredLanguage && this.eq(pod.primaryLanguage, profile.preferredLanguage)) {
      score += 2;
    }

    // Newer, smaller (more available capacity) Pods are lightly favored so
    // matches land in forming communities rather than always the single
    // largest Pod.
    score += 1 / Math.max(1, pod.capacity);

    return score;
  }

  private eq(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
}
