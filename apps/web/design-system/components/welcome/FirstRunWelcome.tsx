'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation, useJourney, useOpportunities, usePlan, useRecommendations, useSession } from '../../../state';
import { useRecommendationSubjects } from '../recommendations';
import { planItemKey } from '../plan/PlanCard';
import type { PlanItemDto } from '../../../lib/api/plan';
import { getMyNeeds, offerResource, respondToOffer, type ResourceOfferResponseValue } from '../../../lib/api/needs';
import { useTheme } from '../../theme';
import { grantConsent } from '../../../lib/api/consent';
import { CURRENT_CONSENT_VERSION } from '../../../lib/config/consent';
import { MEMBER_ARRIVAL_FLAGS } from '../../../lib/config/member-arrival-flags';
import { ConsentStep } from './steps/ConsentStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { HospitalityStep } from './steps/HospitalityStep';
import { ImmediateNeedStep } from './steps/ImmediateNeedStep';
import { OutcomeQuestionStep } from './steps/OutcomeQuestionStep';
import { GoalReflectionStep } from './steps/GoalReflectionStep';
import { FirstMissionStep } from './steps/FirstMissionStep';
import { OpportunityDiscoveryStep } from './steps/OpportunityDiscoveryStep';
import { ReviewApprovalStep } from './steps/ReviewApprovalStep';
import { CoordinatedPlanStep } from './steps/CoordinatedPlanStep';
import { NextStepSummary } from './steps/NextStepSummary';
import { classifyArrivalError, type ArrivalError } from './classify-arrival-error';
import { clearArrivalStep, readArrivalStep, writeArrivalStep, type ArrivalStep } from './arrival-progress';
import { deriveUnderstandingPhase } from './understanding-progress';
import styles from './FirstRunWelcome.module.css';

type Step = ArrivalStep;

export interface FirstRunWelcomeProps {
  /** Skip the hospitality intro for a returning member starting a new mission. */
  skipHospitality?: boolean;
}

/**
 * The guided first-run flow (FPB-015 Phase Three, as reordered by
 * Founder Decision: Welcome composes First Mission, Opportunity
 * Discovery, Review & Approval, and Journey Progress rather than being
 * built after them). Satisfies the Domain Completion Rule end to end:
 * welcomed -> immediate need -> first mission -> opportunities ->
 * review & approval -> understands next step.
 *
 * B6 (Gate B — The Gate): the current step is persisted (`arrival-
 * progress.ts`) and restored on mount, so a member who leaves mid-
 * arrival and returns resumes exactly where they left off rather than
 * repeating completed steps or losing progress. `forceNewMission`
 * (a returning member deliberately starting over) ignores and clears
 * any stale persisted step, since that is an intentional fresh start.
 */
export function FirstRunWelcome({ skipHospitality = false }: FirstRunWelcomeProps) {
  const router = useRouter();
  const { session } = useSession();
  const { motionPreference, setMotionPreference } = useTheme();
  const journey = useJourney();
  const opportunities = useOpportunities();
  const recommendations = useRecommendations();
  const conversation = useConversation();
  const plan = usePlan();

  const [step, setStepState] = useState<Step>(() => {
    if (skipHospitality) {
      clearArrivalStep();
      return 'immediate-need';
    }
    return readArrivalStep() ?? 'consent';
  });
  const [isGrantingConsent, setIsGrantingConsent] = useState(false);
  const [consentError, setConsentError] = useState<ArrivalError | null>(null);
  const [arrivalNeedId, setArrivalNeedId] = useState<string | undefined>(undefined);
  const [decidingPlanItemKeys, setDecidingPlanItemKeys] = useState<string[]>([]);
  const [offerResponseByCityResourceId, setOfferResponseByCityResourceId] = useState<
    Record<string, ResourceOfferResponseValue>
  >({});
  const generatedRef = useRef(false);
  const planBuiltRef = useRef(false);

  const planRecommendations = useMemo(() => {
    if (!plan.state.plan) return [];
    return [plan.state.plan.primary, ...plan.state.plan.supporting]
      .filter((item) => item.source === 'RECOMMENDATION')
      .map((item) => item.recommendation!);
  }, [plan.state.plan]);
  const subjectsById = useRecommendationSubjects(recommendations.state.recommendations);
  const planSubjectsById = useRecommendationSubjects(planRecommendations);

  const goToStep = useCallback((next: Step) => {
    setStepState(next);
    if (next === 'next-step') {
      clearArrivalStep();
    } else {
      writeArrivalStep(next);
    }
  }, []);

  const handleGrantConsent = useCallback(async () => {
    if (!session.accessToken || !session.memberId) return;
    setIsGrantingConsent(true);
    setConsentError(null);
    try {
      await grantConsent(session.accessToken, session.memberId, CURRENT_CONSENT_VERSION);
      setIsGrantingConsent(false);
      goToStep('preferences');
    } catch (error) {
      setIsGrantingConsent(false);
      setConsentError(classifyArrivalError(error));
    }
  }, [session.accessToken, session.memberId, goToStep]);

  const createdGoal =
    !journey.state.isCreatingFirstMission && !journey.state.firstMissionDraft && !journey.state.error
      ? (journey.state.goals[0] ?? null)
      : null;

  /**
   * Member Arrival — Steward Experience migration, Phase 2 (flag-gated).
   * Behind `MEMBER_ARRIVAL_FLAGS.stewardExperience`, the member's stated
   * need is routed through `ConversationsService.ask()` (via
   * `conversation.sendMessage`) rather than straight to
   * `createFirstMission()`, so crisis detection, clarification, and the
   * single outcome question cannot be bypassed on this, the member's
   * first message (Founder ruling: "The arrival experience must route
   * all free-text input through ConversationsService.ask()"). This same
   * handler also carries every follow-up reply in that exchange — a
   * clarifying answer, an outcome answer, or a reply after a crisis
   * redirect — since `sendMessage` continues the same conversation once
   * one exists. Flag off, behavior is unchanged from before this
   * migration.
   */
  const handleImmediateNeed = useCallback(
    (need: string) => {
      if (MEMBER_ARRIVAL_FLAGS.stewardExperience) {
        void conversation.sendMessage(undefined, need);
        return;
      }
      goToStep('first-mission');
      void journey.createFirstMission(need);
    },
    [conversation, journey, goToStep],
  );

  const handleUnderstoodNeed = useCallback(
    (need: string) => {
      goToStep('first-mission');
      void journey.createFirstMission(need);
    },
    [journey, goToStep],
  );

  useEffect(() => {
    if (step !== 'review-approval' || generatedRef.current) return;
    generatedRef.current = true;
    void recommendations.generate('OPPORTUNITY');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /**
   * Member Arrival — Steward Experience migration, Phase 3 (flag-gated).
   * Builds the one Coordinated Plan in place of Opportunity Discovery and
   * Review & Approval (Founder ruling: "Remove the duplicated search-page
   * behavior"). `NeedsService.capture()` on the backend is best-effort —
   * this looks up the resulting StatedNeed by the arrival conversation's
   * id, exactly as the AI Intelligence Engine's own e2e suite already
   * does, and simply proceeds with no `needId` if none is found: the
   * COORDINATED_PLAN goal still returns a real plan from the
   * Recommendation categories alone in that case.
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
        } else if (arrivalNeedId) {
          const updated = await respondToOffer(session.accessToken, arrivalNeedId, item.cityResource!.id, accepted);
          setOfferResponseByCityResourceId((previous) => ({ ...previous, [updated.citySheetEntryId]: updated.response }));
        }
      } finally {
        setDecidingPlanItemKeys((keys) => keys.filter((k) => k !== key));
      }
    },
    [session.accessToken, recommendations, arrivalNeedId],
  );

  const nextStepTitle = (() => {
    if (!createdGoal) return null;
    const journeyForGoal = journey.state.journeysByGoalId[createdGoal.id];
    if (!journeyForGoal) return null;
    const milestones = journey.state.milestonesByJourneyId[journeyForGoal.id] ?? [];
    const firstMilestone = milestones[0];
    if (!firstMilestone) return null;
    const tasks = journey.state.tasksByMilestoneId[firstMilestone.id] ?? [];
    return tasks[0]?.title ?? firstMilestone.title;
  })();

  switch (step) {
    case 'consent':
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
      if (!MEMBER_ARRIVAL_FLAGS.stewardExperience) {
        return <ImmediateNeedStep onSubmit={handleImmediateNeed} submitting={journey.state.isCreatingFirstMission} />;
      }

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
          onContinue={() => goToStep(MEMBER_ARRIVAL_FLAGS.stewardExperience ? 'coordinated-plan' : 'opportunities')}
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
          onContinue={() => goToStep('next-step')}
        />
      );

    case 'opportunities':
      return (
        <OpportunityDiscoveryStep
          searchHint={createdGoal?.title ?? ''}
          results={opportunities.state.results}
          searching={opportunities.state.isSearching}
          error={opportunities.state.error}
          onSearch={(q) => void opportunities.search({ q: q || undefined })}
          isSaved={opportunities.isSaved}
          onToggleSave={(id) => void opportunities.toggleSave(id)}
          onOpenOpportunity={() => router.push('/opportunities')}
          onContinue={() => goToStep('review-approval')}
        />
      );

    case 'review-approval':
      return (
        <ReviewApprovalStep
          recommendations={recommendations.state.recommendations}
          subjectsById={subjectsById}
          generating={recommendations.state.isGenerating}
          error={recommendations.state.error}
          isDeciding={recommendations.isDeciding}
          onApprove={(id) => void recommendations.approve(id)}
          onDismiss={(id) => void recommendations.dismiss(id)}
          onRetry={() => void recommendations.generate('OPPORTUNITY')}
          onContinue={() => goToStep('next-step')}
        />
      );

    case 'next-step':
      return <NextStepSummary nextStepTitle={nextStepTitle} />;

    default:
      return null;
  }
}
