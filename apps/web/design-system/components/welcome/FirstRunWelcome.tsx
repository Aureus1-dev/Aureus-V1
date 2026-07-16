'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJourney, useOpportunities, useRecommendations } from '../../../state';
import { useRecommendationSubjects } from '../recommendations';
import { HospitalityStep } from './steps/HospitalityStep';
import { ImmediateNeedStep } from './steps/ImmediateNeedStep';
import { FirstMissionStep } from './steps/FirstMissionStep';
import { OpportunityDiscoveryStep } from './steps/OpportunityDiscoveryStep';
import { ReviewApprovalStep } from './steps/ReviewApprovalStep';
import { NextStepSummary } from './steps/NextStepSummary';

type Step = 'hospitality' | 'immediate-need' | 'first-mission' | 'opportunities' | 'review-approval' | 'next-step';

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
 */
export function FirstRunWelcome({ skipHospitality = false }: FirstRunWelcomeProps) {
  const router = useRouter();
  const journey = useJourney();
  const opportunities = useOpportunities();
  const recommendations = useRecommendations();

  const [step, setStep] = useState<Step>(skipHospitality ? 'immediate-need' : 'hospitality');
  const subjectsById = useRecommendationSubjects(recommendations.state.recommendations);
  const generatedRef = useRef(false);

  const createdGoal =
    !journey.state.isCreatingFirstMission && !journey.state.firstMissionDraft && !journey.state.error
      ? (journey.state.goals[0] ?? null)
      : null;

  const handleImmediateNeed = useCallback(
    (need: string) => {
      setStep('first-mission');
      void journey.createFirstMission(need);
    },
    [journey],
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
    case 'hospitality':
      return <HospitalityStep onContinue={() => setStep('immediate-need')} />;

    case 'immediate-need':
      return <ImmediateNeedStep onSubmit={handleImmediateNeed} submitting={journey.state.isCreatingFirstMission} />;

    case 'first-mission':
      return (
        <FirstMissionStep
          goal={createdGoal}
          creating={journey.state.isCreatingFirstMission}
          error={journey.state.error}
          onRetry={() => void journey.retryFirstMission()}
          onContinue={() => setStep('opportunities')}
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
          onContinue={() => setStep('review-approval')}
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
          onContinue={() => setStep('next-step')}
        />
      );

    case 'next-step':
      return <NextStepSummary nextStepTitle={nextStepTitle} />;

    default:
      return null;
  }
}
