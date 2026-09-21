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
import {
  ConversationTimeline,
  describeToolCall,
  latestCurrentMessages,
  type MessageEntry,
} from './ConversationTimeline';
import { ApplicationGuidePanel } from './ApplicationGuidePanel';
import { ResponsibilityProgressCard } from './ResponsibilityProgressCard';
import { buildCarryState } from './responsibility-carry-state';
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

    // Clear immediately, before the fetch for the NEW conversation resolves.
    // Without this, switching conversations would leave the PREVIOUS
    // conversation's session/Responsibility state rendered as this
    // conversation's Carry State for as long as the new fetch is pending
    // (independent audit, PR #160).
    setApplicationGuideSession(null);
    setApplicationHelpResponsibility(null);

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

  // Visible Work grammar (UI Slice 1, repaired per independent audit on
  // PR #158): every field is scoped to the CURRENT exchange only, sharing
  // `ConversationTimeline`'s own `latestCurrentMessages` boundary rather
  // than a second, looser derivation. `GoalDto` carries no `conversationId`
  // (`lib/api/goals.ts`) — a member-global ACTIVE Journey goal describes no
  // particular conversation, so it is never used here, not even as a
  // fallback, to avoid an unrelated goal overriding what this conversation
  // is actually doing right now.
  const messageEntries = entries.filter(
    (entry): entry is MessageEntry => entry.type === 'message',
  );
  const currentMessages = latestCurrentMessages(messageEntries);
  const currentUserMessage = currentMessages.find((entry) => entry.message.role === 'USER');

  const currentAssistant = [...currentMessages]
    .reverse()
    .find((entry) => entry.message.role === 'ASSISTANT');
  const currentOpportunity = currentAssistant?.message.opportunityAction;
  const toolReceipts = (currentAssistant?.message.toolCalls ?? [])
    .map(describeToolCall)
    .filter((receipt): receipt is string => Boolean(receipt));

  // Production Carry State (UI Slice 2): once Aureus has formally accepted
  // durable work, that Responsibility — not conversation text — becomes the
  // authoritative source for every Visible Work field below. `carryState` is
  // a pure projection (`responsibility-carry-state.ts`) of the real,
  // conversation-scoped `applicationHelpResponsibility` this component
  // already fetches from `GET /people-help/application/active`; it is
  // deliberately null (never a fabricated "idle" object) when no durable
  // Responsibility exists yet for this conversation, in which case the
  // conversation-derived signals below remain the honest, pre-acceptance
  // fallback — "conversation text may initiate work," but never overrides it.
  //
  // The effect above already clears both pieces of state synchronously on
  // every conversation switch before refetching, but this equality check is
  // kept as an explicit, independent guard (independent audit, PR #160):
  // Carry State is only ever projected from a Responsibility whose own
  // `originConversationId` actually matches the conversation being viewed,
  // so a stale value could never be projected even if some future code path
  // ever set this state outside that effect.
  //
  // This guard is not just for the Visible Work summary: the effect that
  // fetches this state clears it in a `useEffect`, which runs AFTER the
  // render caused by `activeConversationId` changing — so there is still one
  // render where conversation B is active but conversation A's raw
  // Responsibility/session remain in `applicationHelpResponsibility`/
  // `applicationGuideSession`. Every consumer in this section (Visible Work,
  // `ResponsibilityProgressCard`, `ApplicationGuidePanel`, the Resume
  // action, and `hasActiveGuideSession`) must therefore read the
  // conversation-matched values below, never the raw state directly —
  // otherwise A's card/panel could render under B, and the stale Resume
  // button's `originOpportunityId` (A's) could be submitted through
  // `startApplicationGuideForOpportunity`, which always targets the
  // *current* `state.activeConversationId` (B) — binding the wrong action to
  // the wrong conversation (independent audit, PR #160).
  const currentApplicationHelpResponsibility =
    applicationHelpResponsibility?.originConversationId === state.activeConversationId
      ? applicationHelpResponsibility
      : null;
  const currentApplicationGuideSession =
    applicationGuideSession?.conversationId === state.activeConversationId ? applicationGuideSession : null;
  // Real, live session presence — not inferred from Responsibility.status.
  // ACTIVE means only "non-terminal, no wait condition recorded"; it is not
  // proof that Aureus is guiding anything in THIS session right now (OR-002
  // accepts the Responsibility before the guide session necessarily exists,
  // and a member can leave/return without an explicit pause).
  const hasActiveGuideSession = Boolean(currentApplicationGuideSession);
  const carryState = buildCarryState(currentApplicationHelpResponsibility, hasActiveGuideSession);

  const workingOn = carryState ? carryState.workingOn : (currentUserMessage?.message.content ?? null);
  const status = carryState ? carryState.status : null;
  const carrying = carryState
    ? carryState.carrying
    : state.pendingResponse
      ? 'Reading what you shared and figuring out how to help.'
      : toolReceipts.length > 0
        ? toolReceipts.join(' · ')
        : 'Nothing further in progress right now — ask for more anytime.';
  const nextAction = carryState ? carryState.nextAction : null;
  const evidence = carryState ? carryState.evidence : [];
  const lastActivityAt = carryState ? carryState.lastActivityAt : null;

  // A prior turn's opportunity never survives into a new one: once the
  // member starts a new turn, `currentMessages` (from `latestCurrentMessages`)
  // no longer includes the previous assistant reply — even while the new
  // reply is still pending — so `currentOpportunity` is already undefined
  // here. This is the same boundary `ConversationTimeline` itself enforces,
  // not a second, independent guard that could drift from it.
  const needsYou = carryState
    ? carryState.needsYou
    : currentOpportunity
      ? `Review the verified next step Aureus found${currentOpportunity.sourceName ? ' from ' + currentOpportunity.sourceName : ''}.`
      : null;

  const doneMeans = carryState
    ? carryState.doneMeans
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
              status={status}
              carrying={carrying}
              needsYou={needsYou}
              nextAction={nextAction}
              doneMeans={doneMeans}
              evidence={evidence}
              lastActivityAt={lastActivityAt}
            />
          ) : null}

          {entries.length === 0 && !state.pendingResponse ? (
            <>
              <EmptyState
                titleAs="h1"
                title="How can we help?"
                description="Tell me what you want to accomplish."
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

          {currentApplicationHelpResponsibility ? (
            <ResponsibilityProgressCard
              responsibility={currentApplicationHelpResponsibility}
              busy={applicationGuideStarting}
              onResume={
                !hasActiveGuideSession &&
                currentApplicationHelpResponsibility.originOpportunityId &&
                currentApplicationHelpResponsibility.status !== 'COMPLETED'
                  ? () =>
                      void startApplicationGuideForOpportunity(
                        currentApplicationHelpResponsibility.originOpportunityId!,
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

          {currentApplicationGuideSession && session.accessToken ? (
            <ApplicationGuidePanel
              accessToken={session.accessToken}
              session={currentApplicationGuideSession}
              responsibility={currentApplicationHelpResponsibility}
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
