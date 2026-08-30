'use client';

import { useRouter } from 'next/navigation';
import type { PlanItemDto } from '../../../lib/api/plan';
import type { RecommendationSubject } from '../recommendations';
import type { ResourceOfferResponseValue } from '../../../lib/api/needs';
import type { OpportunityActionDto, ToolCallDto } from '../../../lib/api/conversations';
import type { VirtualTimelineEntry } from './build-virtual-timeline';
import { MemberMessage } from './MemberMessage';
import { StewardMessage } from './StewardMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { OpportunityActionCard } from './OpportunityActionCard';
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

type MessageEntry = Extract<VirtualTimelineEntry, { type: 'message' }>;
type WorkEntry = Exclude<VirtualTimelineEntry, { type: 'message' }>;

function subjectFor(
  item: PlanItemDto,
  subjectsById: Record<string, RecommendationSubject>,
): RecommendationSubject | null {
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

const ROUTE_LABELS: Record<string, string> = {
  home: 'Home',
  journey: 'Journey',
  opportunities: 'Opportunities',
  academy: 'Academy',
  conversation: 'the Hall conversation',
  welcome: 'Welcome',
};

function safeArguments(toolCall: ToolCallDto): Record<string, unknown> {
  try {
    const parsed = JSON.parse(toolCall.arguments);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function describeToolCall(toolCall: ToolCallDto): string | null {
  const args = safeArguments(toolCall);
  switch (toolCall.name) {
    case 'navigate_to_route': {
      const route = typeof args.route === 'string' ? ROUTE_LABELS[args.route] : undefined;
      return route ? 'Opened ' + route : null;
    }
    case 'focus_interface_target':
      return 'Brought the relevant item into view';
    case 'focus_form_field':
      return 'Focused the field you need';
    case 'open_panel':
      return 'Opened the Steward workspace';
    case 'close_panel':
      return 'Closed the Steward workspace';
    default:
      return null;
  }
}

function latestCurrentMessages(messageEntries: MessageEntry[], pendingResponse: boolean): MessageEntry[] {
  const last = messageEntries[messageEntries.length - 1];
  if (!last) return [];
  if (pendingResponse && last.message.role === 'USER') return [last];
  return messageEntries.slice(-2);
}

function renderWorkEntry(
  entry: WorkEntry,
  router: ReturnType<typeof useRouter>,
  props: Pick<
    ConversationTimelineProps,
    | 'planSubjectsById'
    | 'planOfferResponseByCityResourceId'
    | 'isDecidingPlanItem'
    | 'onApprovePlanItem'
    | 'onDismissPlanItem'
  >,
) {
  if (entry.type === 'plan') {
    return (
      <div key={entry.key} className={styles.artifactGroup}>
        <p className={styles.artifactLabel}>Plan ready</p>
        {[entry.plan.primary, ...entry.plan.supporting].map((item, index) => {
          const card = (
            <PlanCard
              key={planItemKey(item)}
              item={item}
              role={index === 0 ? 'Primary' : 'Supporting'}
              subject={subjectFor(item, props.planSubjectsById)}
              offerResponse={offerResponseFor(item, props.planOfferResponseByCityResourceId)}
              deciding={props.isDecidingPlanItem(item)}
              onApprove={() => props.onApprovePlanItem(item)}
              onDismiss={() => props.onDismissPlanItem(item)}
            />
          );
          return item.source === 'RECOMMENDATION' ? (
            <ApprovalCard key={planItemKey(item)}>{card}</ApprovalCard>
          ) : (
            card
          );
        })}
      </div>
    );
  }

  if (entry.type === 'journey-update') {
    return (
      <div key={entry.key} className={styles.artifactGroup}>
        <p className={styles.artifactLabel}>Journey updated</p>
        <JourneyCard goal={entry.goal} onOpen={() => router.push('/journey')} />
      </div>
    );
  }

  return (
    <div key={entry.key} className={styles.artifactGroup}>
      <p className={styles.artifactLabel}>Document ready</p>
      <DocumentTimelineCard document={entry.document} />
    </div>
  );
}

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
  const messageEntries = entries.filter((entry): entry is MessageEntry => entry.type === 'message');
  const workEntries = entries.filter((entry): entry is WorkEntry => entry.type !== 'message');
  const currentMessages = latestCurrentMessages(messageEntries, pendingResponse);

  // Point-in-time external actions and interface receipts belong only to the
  // current exchange. Keeping them actionable after the conversation moves on
  // would silently extend freshness/verification beyond the server response
  // that produced them. Durable domain work (plans/Journey/documents) remains
  // below; an external action must be re-resolved on a later turn.
  const currentAssistant = [...currentMessages]
    .reverse()
    .find((entry) => entry.message.role === 'ASSISTANT');
  const toolReceipts = (currentAssistant?.message.toolCalls ?? [])
    .map(describeToolCall)
    .filter((receipt): receipt is string => Boolean(receipt));

  const currentOpportunity = [...currentMessages]
    .reverse()
    .map((entry) => entry.message.opportunityAction)
    .find((action): action is OpportunityActionDto => Boolean(action));

  const hasWork =
    pendingResponse ||
    toolReceipts.length > 0 ||
    Boolean(currentOpportunity) ||
    workEntries.length > 0;

  return (
    <div className={styles.timeline}>
      <section
        className={styles.captionStage}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Current conversation"
      >
        {currentMessages.map((entry) =>
          entry.message.role === 'USER' ? (
            <MemberMessage key={entry.key} content={entry.message.content} />
          ) : (
            <StewardMessage key={entry.key} content={entry.message.content} />
          ),
        )}
      </section>

      {hasWork ? (
        <section className={styles.workStage} aria-label="Work from this conversation">
          <div className={styles.workHeading}>
            <span className={styles.workKicker}>Aureus is working with you</span>
            <span className={styles.workRule} aria-hidden="true" />
          </div>

          {pendingResponse ? <ThinkingIndicator /> : null}

          {toolReceipts.length > 0 ? (
            <ul className={styles.receipts} aria-label="Completed interface actions">
              {toolReceipts.map((receipt) => (
                <li key={receipt}>
                  <span aria-hidden="true">✓</span>
                  <span>{receipt}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {currentOpportunity ? (
            <div className={styles.artifactGroup}>
              <p className={styles.artifactLabel}>
                Verified action ready
                {currentOpportunity.sourceName ? ' · ' + currentOpportunity.sourceName : ''}
              </p>
              <OpportunityActionCard action={currentOpportunity} onStartGuide={onStartApplicationGuide} />
            </div>
          ) : null}

          {workEntries.map((entry) =>
            renderWorkEntry(entry, router, {
              planSubjectsById,
              planOfferResponseByCityResourceId,
              isDecidingPlanItem,
              onApprovePlanItem,
              onDismissPlanItem,
            }),
          )}
        </section>
      ) : null}
    </div>
  );
}
