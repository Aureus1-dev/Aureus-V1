'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourney, useOpportunities, useRecommendations, useSession } from '../../../state';
import { useRecommendationSubjects } from '../recommendations';
import { useTheme } from '../../theme';
import { grantConsent } from '../../../lib/api/consent';
import { CURRENT_CONSENT_VERSION } from '../../../lib/config/consent';
import { ConsentStep } from './steps/ConsentStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { HospitalityStep } from './steps/HospitalityStep';
import { ImmediateNeedStep } from './steps/ImmediateNeedStep';
import { FirstMissionStep } from './steps/FirstMissionStep';
import { OpportunityDiscoveryStep } from './steps/OpportunityDiscoveryStep';
import { ReviewApprovalStep } from './steps/ReviewApprovalStep';
import { NextStepSummary } from './steps/NextStepSummary';
import { classifyArrivalError, type ArrivalError } from './classify-arrival-error';
import { clearArrivalStep, readArrivalStep, writeArrivalStep, type ArrivalStep } from './arrival-progress';

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

  const [step, setStepState] = useState<Step>(() => {
    if (skipHospitality) {
      clearArrivalStep();
      return 'immediate-need';
    }
    return readArrivalStep() ?? 'consent';
  });
  const [isGrantingConsent, setIsGrantingConsent] = useState(false);
  const [consentError, setConsentError] = useState<ArrivalError | null>(null);
  const subjectsById = useRecommendationSubjects(recommendations.state.recommendations);
  const generatedRef = useRef(false);

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

  const handleImmediateNeed = useCallback(
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

    case 'immediate-need':
      return <ImmediateNeedStep onSubmit={handleImmediateNeed} submitting={journey.state.isCreatingFirstMission} />;

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
          onContinue={() => goToStep('opportunities')}
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
          onContinue={() => goToStep('next-step')}
        />
      );

    case 'next-step':
      return <NextStepSummary nextStepTitle={nextStepTitle} />;

    default:
      return null;
  }
}
