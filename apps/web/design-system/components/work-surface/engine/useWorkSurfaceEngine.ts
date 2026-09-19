'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  GENERAL_MATTER,
  HOUSING_MATTER,
  MOVE_PLAN_MATTER,
  UTILITY_MATTER,
  matterScriptForMessage,
} from './fixtures';
import { detectCarryBoundarySignal, detectUrgentSignal } from './signals';
import type {
  CarryBoundaryState,
  CarryReasonId,
  ClaimStatus,
  MatterScript,
  PrototypeView,
  ScenarioId,
  TranscriptMessage,
} from './types';

interface MatterRuntime {
  script: MatterScript;
  /** -1 = not started. Index into `script.steps`. */
  stepIndex: number;
  needsYouResolved: boolean;
}

export interface EngineState {
  view: PrototypeView;
  previousView: PrototypeView | null;
  messages: TranscriptMessage[];
  matters: Record<string, MatterRuntime>;
  carryBoundary: CarryBoundaryState;
  suppressedReasons: CarryReasonId[];
  continuityWarning: { shown: boolean; resolved: boolean };
  claimStatus: ClaimStatus;
  claimErrorMessage: string | null;
  /** PROTOTYPE FIXTURE — simulated returning-member identity for review; independent of the real guest session. */
  reviewerName: string | null;
}

type Action =
  | { type: 'RESET_TO_SCENARIO'; scenario: ScenarioId }
  | { type: 'SET_URGENT_MODE' }
  | { type: 'SUBMIT_MESSAGE'; text: string; attachments: string[] }
  | { type: 'ADVANCE_STEP'; matterId: string }
  | { type: 'RESOLVE_NEEDS_YOU'; matterId: string }
  | { type: 'OPEN_MATTER'; matterId: string }
  | { type: 'CARRY_INTENT_YES' }
  | { type: 'CARRY_INTENT_NO' }
  | { type: 'CARRY_RETURN_TO_IDLE' }
  | { type: 'CARRY_PANEL_DECLINE' }
  | { type: 'CLAIM_START' }
  | { type: 'CLAIM_SUCCESS' }
  | { type: 'CLAIM_ERROR'; message: string }
  | { type: 'CLAIM_RESET' }
  | { type: 'SHOW_CONTINUITY_WARNING' }
  | { type: 'CONTINUITY_WARNING_ACCEPT' }
  | { type: 'CONTINUITY_WARNING_DISMISS' }
  | { type: 'TRIGGER_ERROR' }
  | { type: 'RETRY_FROM_ERROR' }
  | { type: 'START_NEW_REQUEST' };

function runtimeFor(script: MatterScript, stepIndex: number): MatterRuntime {
  return { script, stepIndex, needsYouResolved: false };
}

function initialStateForScenario(scenario: ScenarioId): EngineState {
  const base: EngineState = {
    view: { kind: 'arrival', mode: 'ordinary' },
    previousView: null,
    messages: [],
    matters: {},
    carryBoundary: { status: 'idle', reason: null },
    suppressedReasons: [],
    continuityWarning: { shown: false, resolved: false },
    claimStatus: 'idle',
    claimErrorMessage: null,
    reviewerName: null,
  };

  switch (scenario) {
    case 'urgent':
      return { ...base, view: { kind: 'arrival', mode: 'urgent' } };
    case 'returning-one':
      return {
        ...base,
        view: { kind: 'returning-one', matterId: HOUSING_MATTER.id },
        matters: { [HOUSING_MATTER.id]: runtimeFor(HOUSING_MATTER, 3) },
        reviewerName: 'Jordan',
      };
    case 'returning-several':
      return {
        ...base,
        view: { kind: 'returning-several' },
        matters: {
          [HOUSING_MATTER.id]: runtimeFor(HOUSING_MATTER, 3),
          [UTILITY_MATTER.id]: runtimeFor(UTILITY_MATTER, 1),
          [MOVE_PLAN_MATTER.id]: runtimeFor(MOVE_PLAN_MATTER, 0),
        },
        reviewerName: 'Jordan',
      };
    case 'returning-none':
      return { ...base, view: { kind: 'returning-none' }, reviewerName: 'Jordan' };
    case 'error':
      return {
        ...base,
        view: { kind: 'error' },
        previousView: { kind: 'active-work', matterId: UTILITY_MATTER.id },
        matters: { [UTILITY_MATTER.id]: runtimeFor(UTILITY_MATTER, 1) },
      };
    case 'arrival':
    default:
      return base;
  }
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'RESET_TO_SCENARIO':
      return initialStateForScenario(action.scenario);

    case 'SET_URGENT_MODE': {
      if (state.view.kind !== 'arrival') return state;
      return { ...state, view: { kind: 'arrival', mode: 'urgent' } };
    }

    case 'SUBMIT_MESSAGE': {
      const message: TranscriptMessage = {
        id: `msg-${state.messages.length}`,
        author: 'member',
        text: action.text,
        attachments: action.attachments,
      };
      const withMessage = { ...state, messages: [...state.messages, message] };

      const urgent = detectUrgentSignal(action.text);
      const carryReason = detectCarryBoundarySignal(action.text);
      const alreadySuppressed = carryReason
        ? state.suppressedReasons.includes(carryReason.id)
        : false;

      // A durable-carry request is checked before anything else changes,
      // so it can be answered without losing the member's place — the
      // portfolio's "the work remains visually behind/around the prompt"
      // rule (portfolio §6, State D).
      if (carryReason && !alreadySuppressed && state.carryBoundary.status === 'idle') {
        return {
          ...withMessage,
          view:
            urgent && withMessage.view.kind === 'arrival'
              ? { kind: 'arrival', mode: 'urgent' }
              : withMessage.view,
          carryBoundary: { status: 'intent-prompt', reason: carryReason },
        };
      }

      // Arrival/returning views with no active matter yet: start one.
      if (
        withMessage.view.kind === 'arrival' ||
        withMessage.view.kind === 'understanding' ||
        withMessage.view.kind === 'returning-none'
      ) {
        const script = matterScriptForMessage(action.text);
        const nextMode = urgent
          ? 'urgent'
          : withMessage.view.kind === 'arrival'
            ? withMessage.view.mode
            : 'ordinary';
        return {
          ...withMessage,
          view: { kind: 'understanding', mode: nextMode },
          matters: { ...withMessage.matters, [script.id]: runtimeFor(script, -1) },
        };
      }

      // Already inside a matter: this is "ask Aureus anything about this work" — the
      // transcript grows, but Slice 0 does not script a reply (no fabricated capability).
      return withMessage;
    }

    case 'ADVANCE_STEP': {
      const runtime = state.matters[action.matterId];
      if (!runtime) return state;
      const nextIndex = Math.min(runtime.stepIndex + 1, runtime.script.steps.length - 1);
      const nextMatters = {
        ...state.matters,
        [action.matterId]: { ...runtime, stepIndex: nextIndex },
      };

      // Once a real matter exists, "understanding" resolves into the work surface.
      const nextView: PrototypeView =
        state.view.kind === 'understanding'
          ? { kind: 'active-work', matterId: action.matterId }
          : state.view;

      return { ...state, matters: nextMatters, view: nextView };
    }

    case 'RESOLVE_NEEDS_YOU': {
      const runtime = state.matters[action.matterId];
      if (!runtime) return state;
      return {
        ...state,
        matters: { ...state.matters, [action.matterId]: { ...runtime, needsYouResolved: true } },
      };
    }

    case 'OPEN_MATTER':
      return { ...state, view: { kind: 'active-work', matterId: action.matterId } };

    case 'CARRY_INTENT_YES':
      if (state.carryBoundary.status !== 'intent-prompt') return state;
      return { ...state, carryBoundary: { ...state.carryBoundary, status: 'panel' } };

    case 'CARRY_INTENT_NO':
    case 'CARRY_PANEL_DECLINE': {
      const reasonId = state.carryBoundary.reason?.id;
      return {
        ...state,
        carryBoundary: { status: 'declined-recently', reason: state.carryBoundary.reason },
        suppressedReasons: reasonId
          ? [...new Set([...state.suppressedReasons, reasonId])]
          : state.suppressedReasons,
      };
    }

    case 'CARRY_RETURN_TO_IDLE':
      return { ...state, carryBoundary: { status: 'idle', reason: null } };

    case 'CLAIM_START':
      return { ...state, claimStatus: 'pending', claimErrorMessage: null };

    case 'CLAIM_SUCCESS':
      return {
        ...state,
        claimStatus: 'success',
        carryBoundary: { status: 'idle', reason: null },
        continuityWarning: { shown: false, resolved: true },
      };

    case 'CLAIM_ERROR':
      return { ...state, claimStatus: 'error', claimErrorMessage: action.message };

    case 'CLAIM_RESET':
      return { ...state, claimStatus: 'idle', claimErrorMessage: null };

    case 'SHOW_CONTINUITY_WARNING':
      if (state.continuityWarning.resolved) return state;
      return { ...state, continuityWarning: { shown: true, resolved: false } };

    case 'CONTINUITY_WARNING_ACCEPT':
      return {
        ...state,
        continuityWarning: { shown: false, resolved: true },
        carryBoundary: {
          status: 'panel',
          reason: {
            id: 'continuity-warning',
            why: 'This guest visit is temporary — an account is what lets Aureus keep this work safely beyond it.',
          },
        },
      };

    case 'CONTINUITY_WARNING_DISMISS':
      return { ...state, continuityWarning: { shown: false, resolved: true } };

    case 'TRIGGER_ERROR':
      if (state.view.kind === 'error') return state;
      return { ...state, previousView: state.view, view: { kind: 'error' } };

    case 'RETRY_FROM_ERROR':
      return {
        ...state,
        view: state.previousView ?? { kind: 'arrival', mode: 'ordinary' },
        previousView: null,
      };

    case 'START_NEW_REQUEST':
      return { ...state, view: { kind: 'arrival', mode: 'ordinary' } };

    default:
      return state;
  }
}

/**
 * PROTOTYPE FIXTURE ENGINE. Owns every piece of interactive state for the
 * isolated Work Surface prototype (Slice 0). Nothing here talks to a real
 * backend, a real orchestrator, or real member accounts — the one
 * exception (documented at the call site in `CarryBoundaryPanel`) is the
 * genuine `useSession().claimAccount` call, which really does upgrade a
 * real guest session, because Slice 0 reuses the app's existing real
 * guest/claim infrastructure rather than faking it.
 */
export function useWorkSurfaceEngine(initialScenario: ScenarioId) {
  const [state, dispatch] = useReducer(reducer, initialScenario, initialStateForScenario);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  function schedule(fn: () => void, delay: number) {
    const handle = setTimeout(() => {
      timers.current.delete(handle);
      fn();
    }, delay);
    timers.current.add(handle);
  }

  // Drives the scripted "Now" sequence forward one step at a time. This is
  // the file-level-documented fixture timeline substituting for real
  // orchestration events (see engine/types.ts header comment).
  useEffect(() => {
    let matterId: string | null = null;
    if (state.view.kind === 'active-work') {
      matterId = state.view.matterId;
    } else if (state.view.kind === 'understanding') {
      matterId =
        Object.keys(state.matters).find((id) => state.matters[id]!.stepIndex === -1) ?? null;
    }
    if (!matterId) return;
    const runtime = state.matters[matterId];
    if (!runtime) return;
    if (runtime.stepIndex >= runtime.script.steps.length - 1) return;

    const nextStep = runtime.script.steps[runtime.stepIndex + 1];
    if (!nextStep) return;
    schedule(
      () => dispatch({ type: 'ADVANCE_STEP', matterId }),
      runtime.stepIndex === -1 ? 500 : nextStep.holdMs,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.matters]);

  // Guest continuity warning (review addendum §5.7): once a guest has
  // meaningful, unclaimed work (an artifact exists) and has not already
  // been asked, surface the passive truthful warning — once.
  useEffect(() => {
    if (state.continuityWarning.resolved || state.continuityWarning.shown) return;
    if (state.carryBoundary.status !== 'idle') return;
    const hasArtifactReady = Object.values(state.matters).some(
      (m) => m.stepIndex >= m.script.artifactAt && m.script.artifactAt >= 0,
    );
    if (!hasArtifactReady) return;
    schedule(() => dispatch({ type: 'SHOW_CONTINUITY_WARNING' }), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matters, state.continuityWarning, state.carryBoundary.status]);

  // False-positive recovery (review addendum §5.6): after a decline, the
  // prompt itself recedes shortly after so the member is not left staring
  // at a "declined" acknowledgement — the interface "immediately returns
  // to work without punishment, blocking, or nagging."
  useEffect(() => {
    if (state.carryBoundary.status !== 'declined-recently') return;
    schedule(() => dispatch({ type: 'CARRY_RETURN_TO_IDLE' }), 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.carryBoundary.status]);

  const submitMessage = useCallback((text: string, attachments: string[] = []) => {
    dispatch({ type: 'SUBMIT_MESSAGE', text, attachments });
  }, []);

  const setUrgentMode = useCallback(() => dispatch({ type: 'SET_URGENT_MODE' }), []);
  const resolveNeedsYou = useCallback(
    (matterId: string) => dispatch({ type: 'RESOLVE_NEEDS_YOU', matterId }),
    [],
  );
  const openMatter = useCallback(
    (matterId: string) => dispatch({ type: 'OPEN_MATTER', matterId }),
    [],
  );
  const carryIntentYes = useCallback(() => dispatch({ type: 'CARRY_INTENT_YES' }), []);
  const carryIntentNo = useCallback(() => dispatch({ type: 'CARRY_INTENT_NO' }), []);
  const carryPanelDecline = useCallback(() => dispatch({ type: 'CARRY_PANEL_DECLINE' }), []);
  const continuityWarningAccept = useCallback(
    () => dispatch({ type: 'CONTINUITY_WARNING_ACCEPT' }),
    [],
  );
  const continuityWarningDismiss = useCallback(
    () => dispatch({ type: 'CONTINUITY_WARNING_DISMISS' }),
    [],
  );
  const triggerError = useCallback(() => dispatch({ type: 'TRIGGER_ERROR' }), []);
  const retryFromError = useCallback(() => dispatch({ type: 'RETRY_FROM_ERROR' }), []);
  const startNewRequest = useCallback(() => dispatch({ type: 'START_NEW_REQUEST' }), []);
  const resetToScenario = useCallback(
    (scenario: ScenarioId) => dispatch({ type: 'RESET_TO_SCENARIO', scenario }),
    [],
  );
  const claimStart = useCallback(() => dispatch({ type: 'CLAIM_START' }), []);
  const claimSuccess = useCallback(() => dispatch({ type: 'CLAIM_SUCCESS' }), []);
  const claimError = useCallback(
    (message: string) => dispatch({ type: 'CLAIM_ERROR', message }),
    [],
  );
  const claimReset = useCallback(() => dispatch({ type: 'CLAIM_RESET' }), []);

  return {
    state,
    submitMessage,
    setUrgentMode,
    resolveNeedsYou,
    openMatter,
    carryIntentYes,
    carryIntentNo,
    carryPanelDecline,
    continuityWarningAccept,
    continuityWarningDismiss,
    triggerError,
    retryFromError,
    startNewRequest,
    resetToScenario,
    claimStart,
    claimSuccess,
    claimError,
    claimReset,
  };
}

export type WorkSurfaceEngine = ReturnType<typeof useWorkSurfaceEngine>;
