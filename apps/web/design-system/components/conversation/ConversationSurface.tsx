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
import {
  getMyResponsibilities,
  type ResponsibilityDto,
} from '../../../lib/api/responsibilities';
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
import { ActiveWorkSurface } from './ActiveWorkSurface';
import { buildCarryState } from './responsibility-carry-state';
import { LegalMatterPanel } from './LegalMatterPanel';
import { MessageComposer } from './MessageComposer';
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
 * surface. UI-004 extends the existing one Active Work presentation by
 * projecting the current conversation's canonical Personal Need
 * Responsibility when no narrower application-help Responsibility is active.
 * UI-005 and UI-006 reuse that same projection for Asking and Recovering.
 * UI-007 keeps coordinated-plan decisions scoped to the conversation that
 * produced them and makes them history-only when recovery/terminal work truth
 * takes precedence. No second task/wait/recovery/choice store is created.
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
  const [personalNeedResponsibility, setPersonalNeedResponsibility] =
    useState<ResponsibilityDto | null>(null);
  const [applicationGuideError, setApplicationGuideError] = useState<string | null>(null);
  const [applicationGuideStarting, setApplicationGuideStarting] = useState(false);

  const [resolvedNeed, setResolvedNeed] = useState<{
    conversationId: string;
    id: string;
    content?: string;
  } | null>(null);
  const [planBuiltAt, setPlanBuiltAt] = useState<string | null>(null);
  const [planConversationId, setPlanConversationId] = useState<string | null>(null);
  const previousPlanRef = useRef(plan.state.plan);
  const [decidingKeys, setDecidingKeys] = useState<string[]>([]);
  const [offerResponseByConversationId, setOfferResponseByConversationId] = useState<
    Record<string, Record<string, ResourceOfferResponseValue>>
  >({});

  const currentNeed =
    resolvedNeed?.conversationId === state.activeConversationId ? resolvedNeed : null;
  const needId = currentNeed?.id;
  const needContent = currentNeed?.content;
  const currentOfferResponseByCityResourceId = state.activeConversationId
    ? (offerResponseByConversationId[state.activeConversationId] ?? {})
    : {};

  useEffect(() => {
    if (session.isAuthenticated) {
      void loadConversations();
      void journey.loadGoals();
      void connectedExperiences.loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

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

  useEffect(() => {
    const conversationId = state.activeConversationId;
    setResolvedNeed(null);
    if (!session.accessToken || !conversationId) return;

    let cancelled = false;
    void (async () => {
      try {
        const needs = await getMyNeeds(session.accessToken!);
        const match = needs.find((n) => n.conversationId === conversationId);
        if (!cancelled) {
          setResolvedNeed(
            match
              ? {
                  conversationId,
                  id: match.id,
                  content: match.content,
                }
              : null,
          );
        }
      } catch {
        // Best-effort lookup — a plan with no matching StatedNeed simply has no CITY_RESOURCE items to auto-offer.
        if (!cancelled) setResolvedNeed(null);
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

  // UI-004 — Waiting. Reuse the existing self-scoped Responsibility list to
  // locate the canonical Personal Need Responsibility for this conversation.
  // UI-005 Asking and UI-006 Recovering continue to project from the same row;
  // this remains a read projection only and does not create or mutate work truth.
  useEffect(() => {
    if (!session.accessToken || !state.activeConversationId) {
      setPersonalNeedResponsibility(null);
      return;
    }

    setPersonalNeedResponsibility(null);
    let cancelled = false;
    void getMyResponsibilities(session.accessToken)
      .then((rows) => {
        if (cancelled) return;
        const current = rows
          .filter(
            (row) =>
              row.kind === 'PERSONAL_NEED_RESOLUTION' &&
              row.originConversationId === state.activeConversationId,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
        setPersonalNeedResponsibility(current);
      })
      .catch(() => {
        if (!cancelled) setPersonalNeedResponsibility(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session.accessToken, state.activeConversationId]);

  // A PlanContext plan has no conversation id of its own. Capture the active
  // conversation only when a new plan object arrives so switching rooms cannot
  // silently reuse or mutate a prior conversation's plan decision.
  useEffect(() => {
    if (plan.state.plan && plan.state.plan !== previousPlanRef.current) {
      setPlanBuiltAt(new Date().toISOString());
      setPlanConversationId(state.activeConversationId ?? null);
    } else if (!plan.state.plan) {
      setPlanBuiltAt(null);
      setPlanConversationId(null);
    }
    previousPlanRef.current = plan.state.plan;
  }, [plan.state.plan, state.activeConversationId]);

  useEffect(() => {
    const conversationId = state.activeConversationId;
    if (
      !plan.state.plan ||
      !currentNeed ||
      !session.accessToken ||
      !conversationId ||
      currentNeed.conversationId !== conversationId ||
      planConversationId !== conversationId
    ) return;

    const offerResponses = offerResponseByConversationId[conversationId] ?? {};
    const unoffered = [plan.state.plan.primary, ...plan.state.plan.supporting].filter(
      (item): item is PlanItemDto & { cityResource: NonNullable<PlanItemDto['cityResource']> } =>
        item.source === 'CITY_RESOURCE' &&
        !(item.cityResource!.id in offerResponses),
    );
    if (unoffered.length === 0) return;

    let cancelled = false;
    const resolvedNeedId = currentNeed.id;
    void Promise.all(
      unoffered.map((item) =>
        offerResource(session.accessToken!, resolvedNeedId, item.cityResource.id),
      ),
    ).then((offers) => {
      if (cancelled) return;
      setOfferResponseByConversationId((previous) => {
        const nextForConversation = { ...(previous[conversationId] ?? {}) };
        offers.forEach((offer) => {
          nextForConversation[offer.citySheetEntryId] = offer.response;
        });
        return {
          ...previous,
          [conversationId]: nextForConversation,
        };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    plan.state.plan,
    planConversationId,
    state.activeConversationId,
    currentNeed,
    session.accessToken,
    offerResponseByConversationId,
  ]);

  const planBelongsToCurrentConversation = Boolean(
    plan.state.plan &&
    planBuiltAt &&
    state.activeConversationId &&
    planConversationId === state.activeConversationId,
  );
  const builtPlan: BuiltPlan | null =
    plan.state.plan && planBuiltAt && planBelongsToCurrentConversation
      ? { plan: plan.state.plan, builtAt: planBuiltAt }
      : null;
  const planRecommendations = plan.state.plan && planBelongsToCurrentConversation
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
    const conversationId = state.activeConversationId;
    if (
      !session.accessToken ||
      !conversationId ||
      planConversationId !== conversationId ||
      (item.source === 'CITY_RESOURCE' && !currentNeed)
    ) return;
    const key = planItemKey(item);
    setDecidingKeys((keys) => [...keys, key]);
    try {
      if (item.source === 'RECOMMENDATION') {
        if (accepted) await recommendations.approve(item.recommendation!.id);
        else await recommendations.dismiss(item.recommendation!.id);
      } else if (currentNeed?.conversationId === conversationId) {
        const updated = await respondToOffer(
          session.accessToken,
          currentNeed.id,
          item.cityResource!.id,
          accepted,
        );
        setOfferResponseByConversationId((previous) => ({
          ...previous,
          [conversationId]: {
            ...(previous[conversationId] ?? {}),
            [updated.citySheetEntryId]: updated.response,
          },
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

  const currentApplicationHelpResponsibility =
    applicationHelpResponsibility?.originConversationId === state.activeConversationId
      ? applicationHelpResponsibility
      : null;
  const currentApplicationGuideSession =
    applicationGuideSession?.conversationId === state.activeConversationId ? applicationGuideSession : null;
  const currentPersonalNeedResponsibility =
    personalNeedResponsibility?.originConversationId === state.activeConversationId
      ? personalNeedResponsibility
      : null;

  // Preserve UI-003/application-guide behavior when that narrower accepted
  // Responsibility exists. Otherwise the broader Personal Need Responsibility
  // becomes the same Active Work surface — not a second card.
  const primaryResponsibility =
    currentApplicationHelpResponsibility ?? currentPersonalNeedResponsibility;
  const hasActiveGuideSession = Boolean(currentApplicationGuideSession);
  const carryState = buildCarryState(
    primaryResponsibility,
    primaryResponsibility?.kind === 'OPPORTUNITY_APPLICATION_GUIDANCE' && hasActiveGuideSession,
  );

  const workingOn = carryState ? carryState.workingOn : (currentUserMessage?.message.content ?? null);
  const status = carryState ? carryState.status : null;
  const tone = carryState ? carryState.tone : null;
  const authorityNote = carryState ? carryState.authorityNote : null;
  const recovery = carryState ? carryState.recovery : null;
  const waiting = carryState ? carryState.waiting : null;
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

  const needsYou = carryState
    ? carryState.needsYou
    : currentOpportunity
      ? `Review the verified next step Aureus found${currentOpportunity.sourceName ? ' from ' + currentOpportunity.sourceName : ''}.`
      : null;

  const doneMeans = carryState
    ? carryState.doneMeans
    : "You'll know this is done when Aureus gives you a clear result or next step.";

  const responsibilityIsTerminal = Boolean(
    primaryResponsibility &&
      ['COMPLETED', 'CANCELLED', 'RESPONSIBLY_EXHAUSTED'].includes(primaryResponsibility.status),
  );
  const planChoiceEnabled = Boolean(
    planBelongsToCurrentConversation && !recovery && !responsibilityIsTerminal,
  );

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
            <ActiveWorkSurface
              workingOn={workingOn}
              status={status}
              tone={tone}
              carrying={carrying}
              recovery={recovery}
              waiting={waiting}
              needsYou={needsYou}
              nextAction={nextAction}
              doneMeans={doneMeans}
              evidence={evidence}
              lastActivityAt={lastActivityAt}
              authorityNote={authorityNote}
              resumeBusy={applicationGuideStarting}
              onResume={
                currentApplicationHelpResponsibility &&
                !hasActiveGuideSession &&
                currentApplicationHelpResponsibility.originOpportunityId &&
                currentApplicationHelpResponsibility.status !== 'COMPLETED'
                  ? () =>
                      void startApplicationGuideForOpportunity(
                        currentApplicationHelpResponsibility.originOpportunityId!,
                      )
                  : undefined
              }
              guidePanel={
                currentApplicationGuideSession && session.accessToken ? (
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
                ) : null
              }
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
              planOfferResponseByCityResourceId={currentOfferResponseByCityResourceId}
              planChoiceEnabled={planChoiceEnabled}
              isDecidingPlanItem={(item) => decidingKeys.includes(planItemKey(item))}
              onApprovePlanItem={(item) => decidePlanItem(item, true)}
              onDismissPlanItem={(item) => decidePlanItem(item, false)}
              onStartApplicationGuide={(action) => void startApplicationGuide(action)}
            />
          )}

          {applicationGuideStarting ? (
            <p className={styles.guideStatus} role="status">Preparing application guidance…</p>
          ) : null}

          {applicationGuideError ? (
            <p className={styles.guideError} role="alert">{applicationGuideError}</p>
          ) : null}

          {needId && needContent && state.activeConversationId && session.accessToken ? (
            <LegalMatterPanel
              accessToken={session.accessToken}
              conversationId={state.activeConversationId}
              statedNeedId={needId}
              statedNeedContent={needContent}
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