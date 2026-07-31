'use client';

import { useEffect, useState } from 'react';
import { getOpportunity } from '../../../lib/api/opportunities';
import { getCourse } from '../../../lib/api/academy';
import { useSession } from '../../../state/session/SessionContext';
import type { RecommendationDto } from '../../../lib/api/recommendations';
import type { RecommendationSubject } from './RecommendationCard';

/**
 * Resolves each recommendation's target (Opportunity or Course today;
 * Resource/Pod in future Domains, per the backend's
 * `RecommendationCategory`) into display copy, keyed by recommendation id
 * — not the target id, since two recommendations could in principle point
 * at the same target. Shared between the Welcome flow's one-time review
 * step, the Opportunity Center's standing Recommended tab, and the
 * Academy's learning recommendations (FPB-010 §7 minimal duplication).
 */
export function useRecommendationSubjects(recommendations: RecommendationDto[]): Record<string, RecommendationSubject> {
  const { session } = useSession();
  const [subjectsById, setSubjectsById] = useState<Record<string, RecommendationSubject>>({});

  useEffect(() => {
    if (!session.accessToken) return;
    const unresolved = recommendations.filter((r) => (r.opportunityId || r.courseId) && !subjectsById[r.id]);
    if (unresolved.length === 0) return;
    let cancelled = false;
    void Promise.all(
      unresolved.map(async (r) => {
        if (r.opportunityId) {
          const opportunity = await getOpportunity(session.accessToken!, r.opportunityId);
          return [r.id, { title: opportunity.title, description: opportunity.shortDescription }] as const;
        }
        const course = await getCourse(session.accessToken!, r.courseId!);
        return [r.id, { title: course.title, description: course.shortDescription }] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setSubjectsById((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [recommendations, session.accessToken, subjectsById]);

  return subjectsById;
}
