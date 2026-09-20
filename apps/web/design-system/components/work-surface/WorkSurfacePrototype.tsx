'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SkipLink } from '../../accessibility';
import { ArrivalView } from './ArrivalView';
import { UnderstandingView } from './UnderstandingView';
import { WorkSurfaceView } from './WorkSurfaceView';
import { ReturningOneMatter } from './ReturningOneMatter';
import { ReturningSeveralMatters } from './ReturningSeveralMatters';
import { ErrorRecoveryView } from './ErrorRecoveryView';
import { CarryBoundaryPrompt } from './CarryBoundaryPrompt';
import { CarryBoundaryPanel } from './CarryBoundaryPanel';
import { GuestContinuityWarning } from './GuestContinuityWarning';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import { useWorkSurfaceEngine } from './engine/useWorkSurfaceEngine';
import type { ScenarioId } from './engine/types';
import styles from './WorkSurfacePrototype.module.css';

const KNOWN_SCENARIOS: ScenarioId[] = [
  'arrival',
  'urgent',
  'returning-one',
  'returning-several',
  'returning-none',
  'error',
];

const WHAT_CHANGED_BY_MATTER: Record<string, string> = {
  'matter-housing':
    'Aureus found 2 more programs and confirmed one deadline since your last visit.',
  'matter-utility': 'Aureus finished comparing all 3 programs since your last visit.',
};

function parseScenario(value: string | null): ScenarioId {
  if (value && (KNOWN_SCENARIOS as string[]).includes(value)) return value as ScenarioId;
  return 'arrival';
}

/**
 * Aureus Work Surface — Slice 0 prototype root (isolated route:
 * `/work-surface`). Composes every required state from
 * `AUREUS-WORK-SURFACE-PORTFOLIO.md` / `-REVIEW-ADDENDUM.md` behind one
 * local fixture engine. Not linked from production navigation, disabled by
 * default in production, and intentionally free of real guest/account or
 * orchestration side effects. It does not touch or replace the Living Hall
 * production front door.
 */
export function WorkSurfacePrototype() {
  const searchParams = useSearchParams();
  const initialScenario = useMemo(
    () => parseScenario(searchParams.get('scenario')),
    [searchParams],
  );
  const engine = useWorkSurfaceEngine(initialScenario);
  const { state } = engine;

  const activeMatter =
    state.view.kind === 'active-work' ? state.matters[state.view.matterId] : null;
  const carryingSummary = activeMatter ? activeMatter.script.carrying.map((c) => c.label) : [];

  let main: React.ReactNode;
  switch (state.view.kind) {
    case 'arrival':
      main = (
        <ArrivalView
          mode={state.view.mode}
          onSubmit={engine.submitMessage}
          onRequestUrgent={engine.setUrgentMode}
        />
      );
      break;

    case 'understanding': {
      const lastMessage = state.messages[state.messages.length - 1]?.text ?? '';
      main = <UnderstandingView lastMessage={lastMessage} />;
      break;
    }

    case 'active-work': {
      const matterId = state.view.matterId;
      const matter = state.matters[matterId];
      main = matter ? (
        <WorkSurfaceView
          matter={matter}
          onAsk={engine.submitMessage}
          onResolveNeedsYou={() => engine.resolveNeedsYou(matterId)}
        />
      ) : (
        <ErrorRecoveryView onRetry={engine.retryFromError} />
      );
      break;
    }

    case 'returning-one': {
      const matter = state.matters[state.view.matterId];
      main = matter ? (
        <ReturningOneMatter
          memberName={state.reviewerName ?? 'there'}
          matter={matter.script}
          whatChanged={
            WHAT_CHANGED_BY_MATTER[matter.script.id] ??
            'Aureus kept working on this since your last visit.'
          }
          onContinue={() => engine.openMatter(matter.script.id)}
        />
      ) : (
        <ErrorRecoveryView onRetry={engine.retryFromError} />
      );
      break;
    }

    case 'returning-several':
      main = (
        <ReturningSeveralMatters
          memberName={state.reviewerName ?? 'there'}
          matters={Object.values(state.matters).map((m) => ({
            matter: m.script,
            stepIndex: m.stepIndex,
          }))}
          onOpen={engine.openMatter}
        />
      );
      break;

    case 'returning-none':
      main = (
        <ArrivalView
          mode="ordinary"
          onSubmit={engine.submitMessage}
          onRequestUrgent={engine.setUrgentMode}
          returningMemberName={state.reviewerName ?? undefined}
        />
      );
      break;

    case 'error':
      main = <ErrorRecoveryView onRetry={engine.retryFromError} />;
      break;

    default:
      main = null;
  }

  return (
    <div className={styles.root}>
      <SkipLink />
      {main}

      {state.continuityWarning.shown ? (
        <div className={styles.continuitySlot}>
          <GuestContinuityWarning
            onKeepIt={engine.continuityWarningAccept}
            onDismiss={engine.continuityWarningDismiss}
          />
        </div>
      ) : null}

      {(state.carryBoundary.status === 'intent-prompt' ||
        state.carryBoundary.status === 'declined-recently') && (
        <CarryBoundaryPrompt
          onYes={engine.carryIntentYes}
          onNo={engine.carryIntentNo}
          declined={state.carryBoundary.status === 'declined-recently'}
        />
      )}

      {state.carryBoundary.status === 'panel' && state.carryBoundary.reason ? (
        <CarryBoundaryPanel
          reason={state.carryBoundary.reason}
          carryingSummary={carryingSummary}
          claimStatus={state.claimStatus}
          claimErrorMessage={state.claimErrorMessage}
          onDecline={engine.carryPanelDecline}
          onClaimStart={engine.claimStart}
          onClaimSuccess={engine.claimSuccess}
          onClaimError={engine.claimError}
        />
      ) : null}

      <ScenarioSwitcher onSelect={engine.resetToScenario} onTriggerError={engine.triggerError} />
    </div>
  );
}
