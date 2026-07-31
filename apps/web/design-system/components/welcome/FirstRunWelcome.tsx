'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConversation, useJourney, usePlan, useRecommendations, useSession } from '../../../state';
import { useRecommendationSubjects } from '../recommendations';
import { planItemKey } from '../plan/PlanCard';
import type { PlanItemDto } from '../../../lib/api/plan';
import { getMyNeeds, offerResource, respondToOffer, type ResourceOfferResponseValue } from '../../../lib/api/needs';
import { useTheme } from '../../theme';
import { grantConsent } from '../../../lib/api/consent';
import { CURRENT_CONSENT_VERSION } from '../../../lib/config/consent';
import { ConsentStep } from './steps/ConsentStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { HospitalityStep } from './steps/HospitalityStep';
import { ImmediateNeedStep } from './steps/ImmediateNeedStep';
import { OutcomeQuestionStep } from './steps/OutcomeQuestionStep';
import { GoalReflectionStep } from './steps/GoalReflectionStep';
import { FirstMissionStep } from './steps/FirstMissionStep';
import { CoordinatedPlanStep } from './steps/CoordinatedPlanStep';
import { StewardshipOfferStep } from './steps/StewardshipOfferStep';
import { ExecutionStatusStep, type DecidedPlanItem, type PlanItemDecision } from './steps/ExecutionStatusStep';
import { ArrivalStage } from '../arrival';
import { classifyArrivalError, type ArrivalError } from './classify-arrival-error';
import { clearArrivalStep, readArrivalStep, writeArrivalStep, type ArrivalStep } from './arrival-progress';
import { deriveUnderstandingPhase } from './understanding-progress';
import styles from './FirstRunWelcome.module.css';

type Step = ArrivalStep;

const KNOWN_STEPS = new Set<Step>([
  'consent', 'preferences', 'hospitality', 'immediate-need', 'first-mission',
  'coordinated-plan', 'stewardship-offer', 'next-step',
]);

/**
 * Consent Resequencing (Founder ruling): "Before the visitor submits
 * their first message, provide a brief and calm privacy notice
 * explaining that Aureus will process what they share in order to
 * respond." A notice, not a wall — shown inline, never blocking the
 * member from typing.
 */
const PRIVACY_NOTICE =
  'Aureus uses what you share here to understand how to help. Nothing you share is saved permanently or acted on beyond this conversation without your explicit approval.';

export interface FirstRunWelcomeProps {
  /** Skip the hospitality intro for a returning member starting a new mission. */
  skipHospitality?: boolean;
}

/**
 * The Steward Experience — Aureus's guided first-run flow. Welcomed ->
 * a brief privacy notice, never a consent wall -> immediate need,
 * understood through the same `ConversationsService.ask()` pipeline
 * every conversation uses (so crisis detection, clarification, and the
 * single outcome question can never be bypassed) -> full persistence
 * consent, immediately before the first Goal/Journey/Memory is ever
 * written -> the Coordinated Plan (one Primary next step, genuinely
 * useful Supporting steps, each with its own real approval mechanism) ->
 * the Stewardship Offer (preserving progress is a separate decision from
 * persistence consent, never bundled with it) -> execution status and a
 * long-term stewardship close, never "anything else?".
 *
 * B6 (Gate B — The Gate): the current step is persisted (`arrival-
 * progress.ts`) and restored on mount, so a member who leaves mid-
 * arrival and returns resumes exactly where they left off rather than
 * repeating completed steps or losing progress. `forceNewMission`
 * (a returning member deliberately starting over) ignores and clears
 * any stale persisted step, since that is an intentional fresh start.
 * A step value left over from a previous release (or otherwise
 * unrecognized) is never a dead end — it falls back to `preferences`
 * rather than a blank screen.
 */
export function FirstRunWelcome({ skipHospitality = false }: FirstRunWelcomeProps) {
  const { session } = useSession();
  const { motionPreference, setMotionPreference } = useTheme();
  const journey = useJourney();
  const recommendations = useRecommendations();
  const conversation = useConversation();
  const plan = usePlan();

  const [step, setStepState] = useState<Step>(() => {
    if (skipHospitality) {
      clearArrivalStep();
      return 'immediate-need';
    }
    const persisted = readArrivalStep();
    return persisted && KNOWN_STEPS.has(persisted) ? persisted : 'preferences';
  });
  const [isGrantingConsent, setIsGrantingConsent] = useState(false);
  const [consentError, setConsentError] = useState<ArrivalError | null>(null);
  const [pendingMissionNeed, setPendingMissionNeed] = useState<string | null>(null);
  const [arrivalNeedId, setArrivalNeedId] = useState<string | undefined>(undefined);
  const [decidingPlanItemKeys, setDecidingPlanItemKeys] = useState<string[]>([]);
  const [offerResponseByCityResourceId, setOfferResponseByCityResourceId] = useState<
    Record<string, ResourceOfferResponseValue>
  >({});
  const [planItemDecisions, setPlanItemDecisions] = useState<Record<string, PlanItemDecision>>({});
  const planBuiltRef = useRef(false);

  const planRecommendations = useMemo(() => {
    if (!plan.state.plan) return [];
    return [plan.state.plan.primary, ...plan.state.plan.supporting]
      .filter((item) => item.source === 'RECOMMENDATION')
      .map((item) => item.recommendation!);
  }, [plan.state.plan]);
  const planSubjectsById = useRecommendationSubjects(planRecommendations);

  /**
   * A plain read of what was actually decided on each plan item, keyed by
   * `planItemKey` and populated by `decidePlanItem` itself the moment
   * either real mechanism (RecommendationsContext.approve/dismiss, Gate
   * C's own offer/respond) confirms a decision — not re-derived from
   * either context's own state, since a plan-sourced recommendation was
   * never added to RecommendationsContext's own list via `generate()`.
   * An item left undecided (the member skipped it) is a valid,
   * unpressured outcome, simply absent here — `ExecutionStatusStep` only
   * narrates the ones actually decided.
   */
  const planDecisions = useMemo((): DecidedPlanItem[] => {
    if (!plan.state.plan) return [];
    return [plan.state.plan.primary, ...plan.state.plan.supporting].flatMap((item) => {
      const decision = planItemDecisions[planItemKey(item)];
      if (!decision) return [];
      const title =
        item.source === 'RECOMMENDATION'
          ? (planSubjectsById[item.recommendation!.id]?.title ?? item.categoryLabel)
          : item.cityResource!.organizationName;
      return [{ title, categoryLabel: item.categoryLabel, decision }];
    });
  }, [plan.state.plan, planItemDecisions, planSubjectsById]);

  const goToStep = useCallback((next: Step) => {
    setStepState(next);
    if (next === 'next-step') {
      clearArrivalStep();
    } else {
      writeArrivalStep(next);
    }
  }, []);

  /**
   * Consent Resequencing (Founder ruling): full consent is reached only
   * once — immediately before the first persistent write this flow
   * makes (`createFirstMission`, i.e. Goal/Journey/Memory creation) —
   * and granting it is what actually triggers that write. Persistence
   * consent and account creation (`StewardshipOfferStep`) stay two
   * separate decisions, never bundled into one. `pendingMissionNeed` is
   * only ever unset here if this step was reached with nothing pending
   * (the `consent` case below falls back to restarting understanding in
   * that situation, never reaching this handler).
   */
  const handleGrantConsent = useCallback(async () => {
    if (!session.accessToken || !session.memberId || !pendingMissionNeed) return;
    setIsGrantingConsent(true);
    setConsentError(null);
    try {
      await grantConsent(session.accessToken, session.memberId, CURRENT_CONSENT_VERSION);
      setIsGrantingConsent(false);
      goToStep('first-mission');
      void journey.createFirstMission(pendingMissionNeed);
    } catch (error) {
      setIsGrantingConsent(false);
      setConsentError(classifyArrivalError(error));
    }
  }, [session.accessToken, session.memberId, pendingMissionNeed, journey, goToStep]);

  const createdGoal =
    !journey.state.isCreatingFirstMission && !journey.state.firstMissionDraft && !journey.state.error
      ? (journey.state.goals[0] ?? null)
      : null;

  /**
   * The member's stated need is routed through `ConversationsService.ask()`
   * (via `conversation.sendMessage`) rather than straight to
   * `createFirstMission()`, so crisis detection, clarification, and the
   * single outcome question cannot be bypassed on this, the member's
   * first message (Founder ruling: "The arrival experience must route
   * all free-text input through ConversationsService.ask()"). This same
   * handler also carries every follow-up reply in that exchange — a
   * clarifying answer, an outcome answer, or a reply after a crisis
   * redirect — since `sendMessage` continues the same conversation once
   * one exists.
   */
  const handleImmediateNeed = useCallback(
    (need: string) => {
      void conversation.sendMessage(undefined, need);
    },
    [conversation],
  );

  /**
   * Consent Resequencing (Founder ruling): "Do not invoke
   * createFirstMission() or any other persistent storage until consent
   * has been granted." Once the member confirms (or corrects) what
   * Aureus understood, the need is held, not yet acted on — the actual
   * `createFirstMission` call happens only from `handleGrantConsent`,
   * once full consent is on record.
   */
  const handleUnderstoodNeed = useCallback(
    (need: string) => {
      setPendingMissionNeed(need);
      goToStep('consent');
    },
    [goToStep],
  );

  /**
   * Builds the one Coordinated Plan in place of the search-page-style
   * discovery and review this migration replaced (Founder ruling:
   * "Remove the duplicated search-page behavior"). `NeedsService.capture()`
   * on the backend is best-effort — this looks up the resulting
   * StatedNeed by the arrival conversation's id, exactly as the AI
   * Intelligence Engine's own e2e suite already does, and simply
   * proceeds with no `needId` if none is found: the COORDINATED_PLAN
   * goal still returns a real plan from the Recommendation categories
   * alone in that case.
   */
  useEffect(() => {
    if (step !== 'coordinated-plan' || planBuiltRef.current || !session.accessToken) return;
    planBuiltRef.current = true;
    void (async () => {
      let needId: string | undefined;
      if (conversation.state.activeConversationId) {
        try {
          const needs = await getMyNeeds(session.accessToken!);
          needId = needs.find((n) => n.conversationId === conversation.state.activeConversationId)?.id;
        } catch {
          // Best-effort lookup — a coordinated plan built without a needId
          // is still a real, useful plan (Recommendation categories alone).
        }
      }
      setArrivalNeedId(needId);
      await plan.buildPlan(needId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Every City Sheet match in the plan is offered as soon as it's shown
  // (mirroring Gate C's own NeedResourcesPage), so accept/decline is
  // available immediately rather than requiring a separate step.
  useEffect(() => {
    if (!plan.state.plan || !arrivalNeedId || !session.accessToken) return;
    const unoffered = [plan.state.plan.primary, ...plan.state.plan.supporting].filter(
      (item): item is PlanItemDto & { cityResource: NonNullable<PlanItemDto['cityResource']> } =>
        item.source === 'CITY_RESOURCE' && !(item.cityResource!.id in offerResponseByCityResourceId),
    );
    if (unoffered.length === 0) return;
    let cancelled = false;
    void Promise.all(
      unoffered.map((item) => offerResource(session.accessToken!, arrivalNeedId, item.cityResource.id)),
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
  }, [plan.state.plan, arrivalNeedId, session.accessToken, offerResponseByCityResourceId]);

  /**
   * Deciding on a Coordinated Plan item never re-implements approval — a
   * RECOMMENDATION item still goes through the same
   * RecommendationsContext.approve/dismiss Review & Approval already
   * used; a CITY_RESOURCE item still goes through Gate C's own
   * offer/respond. This only routes to whichever of those two real
   * mechanisms the item's own `source` says applies.
   */
  const decidePlanItem = useCallback(
    async (item: PlanItemDto, accepted: boolean) => {
      if (!session.accessToken) return;
      const key = planItemKey(item);
      setDecidingPlanItemKeys((keys) => [...keys, key]);
      try {
        if (item.source === 'RECOMMENDATION') {
          if (accepted) await recommendations.approve(item.recommendation!.id);
          else await recommendations.dismiss(item.recommendation!.id);
          setPlanItemDecisions((previous) => ({ ...previous, [key]: accepted ? 'ACCEPTED' : 'DISMISSED' }));
        } else if (arrivalNeedId) {
          const updated = await respondToOffer(session.accessToken, arrivalNeedId, item.cityResource!.id, accepted);
          setOfferResponseByCityResourceId((previous) => ({ ...previous, [updated.citySheetEntryId]: updated.response }));
          setPlanItemDecisions((previous) => ({ ...previous, [key]: updated.response as PlanItemDecision }));
        }
      } finally {
        setDecidingPlanItemKeys((keys) => keys.filter((k) => k !== key));
      }
    },
    [session.accessToken, recommendations, arrivalNeedId],
  );

  /**
   * Which step to show — the arrival logic exactly as it was, moved
   * intact into a function purely so the environmental shell below can
   * wrap whatever it returns. `ArrivalRoom` renders this result; it
   * never influences it.
   */
  function renderStep() {
    switch (step) {
      case 'consent':
        // Reached after understanding, immediately before the first
        // persistent write. A resumed session can land here with the
        // pending need lost to a reload (local component state, not
        // persisted) — no dead end, restart understanding rather than
        // granting consent for nothing to actually persist.
        if (!pendingMissionNeed) {
          return <ImmediateNeedStep onSubmit={handleImmediateNeed} submitting={conversation.state.pendingResponse} />;
        }
        return (
          <ConsentStep
            granting={isGrantingConsent}
            error={consentError}
            onGrant={() => void handleGrantConsent()}
            onRetry={() => void handleGrantConsent()}
          />
        );

      case 'preferences':
        return (
          <PreferencesStep
            reducedMotion={motionPreference === 'reduced'}
            onReducedMotionChange={(reducedMotion) => setMotionPreference(reducedMotion ? 'reduced' : 'system')}
            onContinue={() => goToStep('hospitality')}
          />
        );

      case 'hospitality':
        return <HospitalityStep onContinue={() => goToStep('immediate-need')} />;

      case 'immediate-need': {
        const phase = deriveUnderstandingPhase(conversation.timeline);

        if (phase.kind === 'understood') {
          return (
            <GoalReflectionStep
              reflection={phase.reflection}
              onConfirm={() => handleUnderstoodNeed(phase.originalNeed)}
              onAdjust={(revised) => handleUnderstoodNeed(revised)}
            />
          );
        }

        if (phase.kind === 'outcome-question') {
          return (
            <OutcomeQuestionStep
              onSubmit={handleImmediateNeed}
              submitting={conversation.state.pendingResponse}
              error={conversation.state.error}
              onRetry={conversation.clearError}
            />
          );
        }

        return (
          <>
            {phase.kind === 'collecting' ? <p className={styles.priorMessage}>{PRIVACY_NOTICE}</p> : null}
            {phase.kind === 'clarifying' || phase.kind === 'crisis' ? (
              <p className={styles.priorMessage}>{phase.priorMessage}</p>
            ) : null}
            <ImmediateNeedStep onSubmit={handleImmediateNeed} submitting={conversation.state.pendingResponse} />
          </>
        );
      }

      case 'first-mission':
        // A resumed session can land here with no in-flight creation and no
        // created goal (e.g. the member reloaded before submission ever
        // completed) — fall back to immediate-need rather than showing a
        // stuck blank screen (B6: "without being stuck").
        if (!createdGoal && !journey.state.isCreatingFirstMission && !journey.state.error) {
          return <ImmediateNeedStep onSubmit={handleImmediateNeed} submitting={false} />;
        }
        return (
          <FirstMissionStep
            goal={createdGoal}
            creating={journey.state.isCreatingFirstMission}
            error={journey.state.error}
            onRetry={() => void journey.retryFirstMission()}
            onContinue={() => goToStep('coordinated-plan')}
          />
        );

      case 'coordinated-plan':
        return (
          <CoordinatedPlanStep
            plan={plan.state.plan}
            building={plan.state.isBuilding}
            error={plan.state.error}
            subjectsById={planSubjectsById}
            offerResponseByCityResourceId={offerResponseByCityResourceId}
            isDeciding={(item) => decidingPlanItemKeys.includes(planItemKey(item))}
            onApprove={(item) => void decidePlanItem(item, true)}
            onDismiss={(item) => void decidePlanItem(item, false)}
            onRetry={() => void plan.buildPlan(arrivalNeedId)}
            onContinue={() => goToStep('stewardship-offer')}
          />
        );

      case 'stewardship-offer':
        // A separate decision from persistence consent (already granted,
        // earlier, before createFirstMission ever ran) — this is only ever
        // about whether to preserve progress across sessions and devices.
        return <StewardshipOfferStep isGuest={session.isGuest} onContinue={() => goToStep('next-step')} />;

      case 'next-step':
        // Execution status narration + a long-term stewardship prompt
        // (Founder ruling) — never the old "anything else?" close.
        return <ExecutionStatusStep decisions={planDecisions} />;

      default:
        return null;
    }
  }

  // Each step takes the stage of the Hall that `WelcomeFlow` already
  // mounted (AUREUS-003, AUREUS-006) — this flow arrives into a room
  // that is already lit rather than bringing its own. Purely
  // presentational: it wraps the step above without taking any part in
  // choosing it, so every decision this flow makes stays exactly where
  // it was.
  return <ArrivalStage stepKey={step}>{renderStep()}</ArrivalStage>;
}
