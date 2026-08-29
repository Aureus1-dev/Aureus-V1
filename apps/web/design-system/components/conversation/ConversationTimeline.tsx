'use client';

import { useRouter } from 'next/navigation';
import type { PlanItemDto } from '../../../lib/api/plan';
import type { RecommendationSubject } from '../recommendations';
import type { ResourceOfferResponseValue } from '../../../lib/api/needs';
import type { OpportunityActionDto } from '../../../lib/api/conversations';
import type { VirtualTimelineEntry } from './build-virtual-timeline';
import { MemberMessage } from './MemberMessage';
import { StewardMessage } from './StewardMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ApprovalCard } from '../approval-card/ApprovalCard';
import { PlanCard, planItemKey } from '../plan/PlanCard';
import { JourneyCard } from '../journey/JourneyCard';
import { DocumentTimelineCard } from './DocumentTimelineCard';
import styles from './ConversationTimeline.module.css';

export interface ConversationTimelineProps {
  entries: VirtualTimelineEntry[];
  pendingResponse: boolean;
  planSubjectsById: Record<string, RecommendationSubject>;
  planOfferResponseByCityResourceId: Record<string, ResourceOfferResponseValue>;
  isDecidingPlanItem: (item: PlanItemDto) => boolean;
  onApprovePlanItem: (item: PlanItemDto) => void;
  onDismissPlanItem: (item: PlanItemDto) => void;
  onStartApplicationGuide?: (action: OpportunityActionDto) => void;
}

function subjectFor(item: PlanItemDto, subjectsById: Record<string, RecommendationSubject>): RecommendationSubject | null {
  if (item.source !== 'RECOMMENDATION') return null;
  return subjectsById[item.recommendation!.id] ?? null;
}

function offerResponseFor(
  item: PlanItemDto,
  offerResponseByCityResourceId: Record<string, ResourceOfferResponseValue>,
): ResourceOfferResponseValue | null {
  if (item.source !== 'CITY_RESOURCE') return null;
  return offerResponseByCityResourceId[item.cityResource!.id] ?? null;
}

/**
 * Ordered conversation transcript (FPB-005 §3 "Conversation Timeline"),
 * now interleaving synthetic entries alongside real messages (Living
 * Steward Workspace redesign) — a plan/journey-update/document that arose
 * during this conversation renders inline, never forcing a navigation
 * away to act on it. Purely presentational: every plan-item decision
 * still goes through `PlanCard`'s own real, unmodified approval mechanism
 * (`RecommendationCard`/`MatchedResourceCard`) — the actual approve/
 * dismiss/accept/decline calls live in `ConversationSurface`, exactly the
 * same split `CoordinatedPlanStep`/`FirstRunWelcome` already use.
 * `RecommendationCard`'s `ApprovalPanel` has no `Card` shell of its own,
 * so a RECOMMENDATION item is wrapped in `ApprovalCard` for one; a
 * CITY_RESOURCE item's `MatchedResourceCard` already renders its own
 * `Card`, so it is not double-wrapped. `JourneyCard`/`DocumentCard` are
 * reused verbatim for the same reason — both already are cards.
 * `role="log"` announces new messages to assistive technology as they
 * arrive without re-announcing the whole history (FPB-011 §9).
 */
export function ConversationTimeline({
  entries,
  pendingResponse,
  planSubjectsById,
  planOfferResponseByCityResourceId,
  isDecidingPlanItem,
  onApprovePlanItem,
  onDismissPlanItem,
  onStartApplicationGuide,
}: ConversationTimelineProps) {
  const router = useRouter();

  return (
    <div className={styles.timeline} role="log" aria-live="polite" aria-relevant="additions">
      {entries.map((entry) => {
        if (entry.type === 'message') {
          return entry.message.role === 'USER' ? (
            <MemberMessage key={entry.key} content={entry.message.content} />
          ) : (
            <StewardMessage
              key={entry.key}
              content={entry.message.content}
              opportunityAction={entry.message.opportunityAction}
              onStartApplicationGuide={onStartApplicationGuide}
            />
          );
        }

        if (entry.type === 'plan') {
          return (
            <div key={entry.key} className={styles.planEntries}>
              {[entry.plan.primary, ...entry.plan.supporting].map((item, index) => {
                const card = (
                  <PlanCard
                    key={planItemKey(item)}
                    item={item}
                    role={index === 0 ? 'Primary' : 'Supporting'}
                    subject={subjectFor(item, planSubjectsById)}
                    offerResponse={offerResponseFor(item, planOfferResponseByCityResourceId)}
                    deciding={isDecidingPlanItem(item)}
                    onApprove={() => onApprovePlanItem(item)}
                    onDismiss={() => onDismissPlanItem(item)}
                  />
                );
                return item.source === 'RECOMMENDATION' ? <ApprovalCard key={planItemKey(item)}>{card}</ApprovalCard> : card;
              })}
            </div>
          );
        }

        if (entry.type === 'journey-update') {
          return <JourneyCard key={entry.key} goal={entry.goal} onOpen={() => router.push('/journey')} />;
        }

        return <DocumentTimelineCard key={entry.key} document={entry.document} />;
      })}
      {pendingResponse ? <ThinkingIndicator /> : null}
    </div>
  );
}
