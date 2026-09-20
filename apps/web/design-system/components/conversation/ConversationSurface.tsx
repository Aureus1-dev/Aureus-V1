'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useConnectedExperiences,
  useConversation,
  useJourney,
  usePlan,
  useRecommendations,
  useSession,
} from '../../../state';
import { useRecommendationSubjects } from '../recommendations';
import {
  getMyNeeds,
  offerResource,
  respondToOffer,
  type ResourceOfferResponseValue,
} from '../../../lib/api/needs';
import type { PlanItemDto } from '../../../lib/api/plan';
import type { OpportunityActionDto } from '../../../lib/api/conversations';
import { type GuidedApplicationSessionDto } from '../../../lib/api/application-guide';
import {
  getActivePeopleApplicationHelp,
  startPeopleApplicationHelp,
  type PeopleResponsibilityDto,
} from '../../../lib/api/people-help';
import { planItemKey } from '../plan/PlanCard';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VoiceSurface } from '../voice';
import { ConversationHistory } from './ConversationHistory';
import { ConversationTimeline, describeToolCall } from './ConversationTimeline';
import { ApplicationGuidePanel } from './ApplicationGuidePanel';
import { ResponsibilityProgressCard } from './ResponsibilityProgressCard';
import { LegalMatterPanel } from './LegalMatterPanel';
import { MessageComposer } from './MessageComposer';
import { VisibleWorkSummary } from './VisibleWorkSummary';
import { conversationErrorCopy } from './conversation-error-copy';
import { buildVirtualTimeline, type BuiltPlan } from './build-virtual-timeline';
import styles from './ConversationSurface.module.css';
import { V1_FEATURE_FLAGS } from '../../../lib/config/v1-feature-scope';

export interface ConversationSurfaceProps {
  /** From `?mode=voice` — lets another surface (e.g. Home's voice shortcut) deep-link straight into voice mode without importing any Voice Domain internals itself. */
  initialMode?: 'text' | 'voice';
}

/**
 * The Conversation Room (Living Steward Workspace redesign) — the primary
 * surface, sized to occupy ~70-80% of the workspace (`ConversationSurface.
 * module.css`, combined with `AppShell`'s `240px | 1fr | 320px` grid).
 * Composes history, timeline, composer, and recovery presentation around
 * the existing `/ai/conversations` backend contract, unchanged (FPB-015
 * Phase Two, AFX-001 §3). A plan/journey-update/document that arose during
 * the active conversation now renders inline via `buildVirtualTimeline`
 * (a frontend-only composition — the backend has no message↔plan/goal/
 * document correlation) rather than requiring a separate page visit.
 * Deciding on a plan item still goes through that item's own real,
 * unmodified approval mechanism — `recommendations.approve/dismiss` for a
 * RECOMMENDATION item, `offerResource`/`respondToOffer` for a
 * CITY_RESOURCE item, grounded by the same `getMyNeeds()` lookup
 * `FirstRunWelcome` already uses to find the StatedNeed tied to this
 * conversation.
 */
export function ConversationSurface({ initialMode = 'text' }: ConversationSurfaceProps) {
  const { session } = useSession();
  const {
    state,
    timeline,
    loadConversations,
    selectConversation,
    startNewConversation,
    setDraft,
    sendMessage,
    clearError,
  } = useConversation();
  const plan = usePlan();
  const journey = useJourney();
  const connectedExperiences = useConnectedExperiences();
  const recommendations = useRecommendations();
  const [mode, setMode] = useState<'text' | 'voice'>(initialMode);
  const [applicationGuideSession, setApplicationGuideSession] =
    useState<GuidedApplicationSessionDto | null>(null);
  const [applicationHelpResponsibility, setApplicationHelpResponsibility] =
    useState<PeopleResponsibilityDto | null>(null);
  const [applicationGuideError, setApplicationGuideError] = useState<string | null>(null);
  const [applicationGuideStarting, setApplicationGuideStarting] = useState(false);

  const [needId, setNeedId] = useState<string | undefined>(undefined);
  const [needContent, setNeedContent] = useState<string | undefined>(undefined);
  const [planBuiltAt, setPlanBuiltAt] = useState<string | null>(null);
  const previousPlanRef = useRef(plan.state.plan);
  const [decidingKeys, setDecidingKeys] = useState<string[]>([]);
  const [offerResponseByCityResourceId, setOfferResponseByCityResourceId] = useState<
    Record<string, ResourceOfferResponseValue>
  >({});

  useEffect(() => {
    if (session.isAuthenticated) {
      void loadConversations();
      void journey.loadGoals();
      void connectedExperiences.loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  // Returning-member continuity (UI Slice 1): a member with existing
  // conversations should not land on a blank "How can we help?" every
  // time — resume the most recently updated one automatically. Fires at
  // most once per mount (the ref, not just a state check, matters here:
  // `activeConversationId` is also `null` immediately after the member
  // explicitly clicks "New conversation", and this must never undo that
  // deliberate choice on a later render).
  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (autoResumedRef.current) return;
    if (!session.isAuthenticated || state.isLoadingConversations) return;
    if (state.activeConversationId) {
      autoResumedRef.current = true;
      return;
    }
    if (state.conversations.length === 0) return;
    autoResumedRef.current = true;
    const mostRecent = [...state.conversations].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )[0];
    if (mostRecent) void selectConversation(mostRecent.id);
  }, [
    session.isAuthenticated,
    state.isLoadingConversations,
    state.activeConversationId,
    state.conversations,
    selectConversation,
  ]);

  // Grounds an in-conversation plan in the StatedNeed captured for this
  // specific conversation, mirroring FirstRunWelcome's own lookup — a
  // plan built without a needId is still shown, just without any
  // CITY_RESOURCE items to auto-offer.
  useEffect(() => {
    if (!session.accessToken || !state.activeConversationId) {
      setNeedId(undefined);
      setNeedContent(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const needs = await getMyNeeds(session.accessToken!);
        const match = needs.find((n) => n.conversationId === state.activeConversationId);
        if (!cancelled) {
          setNeedId(match?.id);
          setNeedContent(match?.content);
        }
      } catch {
        // Best-effort lookup — a plan with no matching StatedNeed simply has no CITY_RESOURCE items to auto-offer.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.accessToken, state.activeConversationId]);

  useEffect(() => {
    if (!session.accessToken || !state.activeConversationId) {
      setApplicationGuideSession(null);
      setApplicationHelpResponsibility(null);
      return;
    }

    let cancelled = false;
    void getActivePeopleApplicationHelp(
      session.accessToken,
      state.activeConversationId,
    )
      .then((active) => {
        if (cancelled) return;
        setApplicationGuideSession(active?.session ?? null);
        setApplicationHelpResponsibility(active?.responsibility ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setApplicationGuideSession(null);
        setApplicationHelpResponsibility(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session.accessToken, state.activeConversationId]);

  useEffect(() => {
    if (plan.state.plan && plan.state.plan !== previousPlanRef.current) {
      setPlanBuiltAt(new Date().toISOString());
    }
    previousPlanRef.current = plan.state.plan;
  }, [plan.state.plan]);

  // Every City Sheet match in a newly-built plan is offered as soon as it
  // appears (mirroring Gate C's own NeedResourcesPage and FirstRunWelcome),
  // so accept/decline is available immediately.
  useEffect(() => {
    if (!plan.state.plan || !needId || !session.accessToken) return;
    const unoffered = [plan.state.plan.primary, ...plan.state.plan.supporting].filter(
      (item): item is PlanItemDto & { cityResource: NonNullable<PlanItemDto['cityResource']> } =>
        item.source === 'CITY_RESOURCE' &&
        !(item.cityResource!.id in offerResponseByCityResourceId),
    );
    if (unoffered.length === 0) return;
    let cancelled = false;
    void Promise.all(
      unoffered.map((item) => offerResource(session.accessToken!, needId, item.cityResource.id)),
    ).then((offers) => {
      if (cancelled) return;
      setOfferResponseByCityResourceId((previous) => {
        const next = { ...previous };
        offers.forEach((offer) => {
          next[offer.citySheetEntryId] = offer.response;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.state.plan, needId, session.accessToken]);

  const builtPlan: BuiltPlan | null =
    plan.state.plan && planBuiltAt ? { plan: plan.state.plan, builtAt: planBuiltAt } : null;
  const planRecommendations = plan.state.plan
    ? [plan.state.plan.primary, ...plan.state.plan.supporting]
        .filter((item) => item.source === 'RECOMMENDATION')
        .map((item) => item.recommendation!)
    : [];
  const planSubjectsById = useRecommendationSubjects(planRecommendations);

  const startApplicationGuideForOpportunity = async (
    opportunityId: string,
  ) => {
    if (!session.accessToken || !state.activeConversationId || applicationGuideStarting) return;
    setApplicationGuideStarting(true);
    setApplicationGuideError(null);
    try {
      const help = await startPeopleApplicationHelp(
        session.accessToken,
        state.activeConversationId,
        opportunityId,
      );
      setApplicationGuideSession(help.session);
      setApplicationHelpResponsibility(help.responsibility);
    } catch {
      setApplicationGuideError(
        'Aureus could not start or resume application help. The Responsibility remains visible if Aureus already accepted it.',
      );
    } finally {
      setApplicationGuideStarting(false);
    }
  };

  const startApplicationGuide = async (action: OpportunityActionDto) => {
    await startApplicationGuideForOpportunity(action.opportunityId);
  };

  const decidePlanItem = async (item: PlanItemDto, accepted: boolean) => {
    if (!session.accessToken) return;
    const key = planItemKey(item);
    setDecidingKeys((keys) => [...keys, key]);
    try {
      if (item.source === 'RECOMMENDATION') {
        if (accepted) await recommendations.approve(item.recommendation!.id);
        else await recommendations.dismiss(item.recommendation!.id);
      } else if (needId) {
        const updated = await respondToOffer(
          session.accessToken,
          needId,
          item.cityResource!.id,
          accepted,
        );
        setOfferResponseByCityResourceId((previous) => ({
          ...previous,
          [updated.citySheetEntryId]: updated.response,
        }));
      }
    } finally {
      setDecidingKeys((keys) => keys.filter((k) => k !== key));
    }
  };

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to talk with your steward"
        description="Conversation is where your Aureus journey begins. Sign in to continue."
      />
    );
  }

  const errorCopy = state.error ? conversationErrorCopy(state.error.kind) : null;
  const entries = buildVirtualTimeline(
    timeline,
    builtPlan,
    journey.state.goals,
    connectedExperiences.state.documents,
  );

  // Visible Work grammar (UI Slice 1): every field below is read from data
  // this component already has for real reasons (the member's own words, a
  // real Goal record, the latest reply's real tool calls, a real pending
  // approval) — nothing here is invented, timed, or fabricated to look busy.
  const activeGoal = journey.state.goals.find((goal) => goal.status === 'ACTIVE') ?? null;
  const firstUserMessage = entries.find(
    (entry) => entry.type === 'message' && entry.message.role === 'USER',
  );
  const workingOn =
    activeGoal?.title ??
    (firstUserMessage?.type === 'message' ? firstUserMessage.message.content : null);

  const lastAssistantMessage = [...entries]
    .reverse()
    .find((entry) => entry.type === 'message' && entry.message.role === 'ASSISTANT');
  const currentOpportunity =
    lastAssistantMessage?.type === 'message' ? lastAssistantMessage.message.opportunityAction : undefined;
  const toolReceipts =
    lastAssistantMessage?.type === 'message'
      ? (lastAssistantMessage.message.toolCalls ?? [])
          .map(describeToolCall)
          .filter((receipt): receipt is string => Boolean(receipt))
      : [];
  const carrying = state.pendingResponse
    ? 'Reading what you shared and figuring out how to help.'
    : toolReceipts.length > 0
      ? toolReceipts.join(' · ')
      : 'Nothing further in progress right now — ask for more anytime.';

  const needsResumeApplication =
    !applicationGuideSession &&
    Boolean(applicationHelpResponsibility?.originOpportunityId) &&
    applicationHelpResponsibility?.status !== 'COMPLETED';
  const needsYou = currentOpportunity
    ? `Review the verified next step Aureus found${currentOpportunity.sourceName ? ' from ' + currentOpportunity.sourceName : ''}.`
    : needsResumeApplication
      ? 'Resume the application Aureus already started for you.'
      : null;

  const doneMeans = activeGoal
    ? `You'll know this is done when "${activeGoal.title}" is finished.`
    : "You'll know this is done when Aureus gives you a clear result or next step.";

  return (
    <div className={styles.surface}>
      <ConversationHistory
        conversations={state.conversations}
        activeConversationId={state.activeConversationId}
        messages={timeline}
        onSelect={(id) => void selectConversation(id)}
        onStartNew={startNewConversation}
      />

      {V1_FEATURE_FLAGS.voice ? (
        <div className={styles.modeToggle}>
          <Button
            type="button"
            variant={mode === 'text' ? 'primary' : 'secondary'}
            onClick={() => setMode('text')}
            aria-pressed={mode === 'text'}
          >
            Type
          </Button>
          <Button
            type="button"
            variant={mode === 'voice' ? 'primary' : 'secondary'}
            onClick={() => setMode('voice')}
            aria-pressed={mode === 'voice'}
          >
            Talk
          </Button>
        </div>
      ) : null}

      {mode === 'voice' ? (
        <VoiceSurface
          conversationId={state.activeConversationId ?? undefined}
          onClose={() => setMode('text')}
        />
      ) : (
        <>
          {workingOn ? (
            <VisibleWorkSummary
              workingOn={workingOn}
              carrying={carrying}
              needsYou={needsYou}
              doneMeans={doneMeans}
            />
          ) : null}

          {entries.length === 0 && !state.pendingResponse ? (
            <>
              <p className={styles.promise}>
                Tell Aureus what you want to accomplish.
                <br />
                Aureus figures out how to get it done.
              </p>
              <EmptyState
                titleAs="h1"
                title="How can we help?"
                description="Tell us what is happening in your own words—by typing or talking. We’ll take on as much as we responsibly can, and help you see it through."
              />
              <p className={styles.privacyNotice}>
                We use what you share to respond. Aureus will ask before taking action or saving
                anything as lasting memory.
              </p>
            </>
          ) : (
            <ConversationTimeline
              entries={entries}
              pendingResponse={state.pendingResponse}
              planSubjectsById={planSubjectsById}
              planOfferResponseByCityResourceId={offerResponseByCityResourceId}
              isDecidingPlanItem={(item) => decidingKeys.includes(planItemKey(item))}
              onApprovePlanItem={(item) => void decidePlanItem(item, true)}
              onDismissPlanItem={(item) => void decidePlanItem(item, false)}
              onStartApplicationGuide={(action) => void startApplicationGuide(action)}
            />
          )}

          {applicationGuideStarting ? (
            <p className={styles.guideStatus} role="status">Preparing application guidance…</p>
          ) : null}

          {applicationGuideError ? (
            <p className={styles.guideError} role="alert">{applicationGuideError}</p>
          ) : null}

          {applicationHelpResponsibility ? (
            <ResponsibilityProgressCard
              responsibility={applicationHelpResponsibility}
              busy={applicationGuideStarting}
              onResume={
                !applicationGuideSession &&
                applicationHelpResponsibility.originOpportunityId &&
                applicationHelpResponsibility.status !== 'COMPLETED'
                  ? () =>
                      void startApplicationGuideForOpportunity(
                        applicationHelpResponsibility.originOpportunityId!,
                      )
                  : undefined
              }
            />
          ) : null}

          {needId && needContent && state.activeConversationId && session.accessToken ? (
            <LegalMatterPanel
              accessToken={session.accessToken}
              conversationId={state.activeConversationId}
              statedNeedId={needId}
              statedNeedContent={needContent}
            />
          ) : null}

          {applicationGuideSession && session.accessToken ? (
            <ApplicationGuidePanel
              accessToken={session.accessToken}
              session={applicationGuideSession}
              responsibility={applicationHelpResponsibility}
              onSessionChange={setApplicationGuideSession}
              onResponsibilityChange={setApplicationHelpResponsibility}
              onEnded={() => {
                setApplicationGuideSession(null);
                setApplicationGuideError(null);
              }}
            />
          ) : null}

          {errorCopy ? (
            <ErrorState
              title={errorCopy.title}
              description={errorCopy.description}
              action={
                state.error?.retryable && state.draft.trim().length > 0 ? (
                  <Button variant="secondary" onClick={() => void sendMessage()}>
                    Try again
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={clearError}>
                    Dismiss
                  </Button>
                )
              }
            />
          ) : null}

          <MessageComposer
            value={state.draft}
            onChange={setDraft}
            onSubmit={() => void sendMessage()}
            disabled={state.pendingResponse}
          />
        </>
      )}
    </div>
  );
}
