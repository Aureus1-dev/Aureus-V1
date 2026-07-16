'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { createGoal, listGoals, type GoalDto } from '../../lib/api/goals';
import { createJourney, getJourneyByGoal, type JourneyDto } from '../../lib/api/journeys';
import { createMilestone, listMilestones, updateMilestone, type MilestoneDto } from '../../lib/api/milestones';
import { createTask, listTasks, updateTask, type TaskDto } from '../../lib/api/tasks';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type JourneyErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface JourneyError {
  kind: JourneyErrorKind;
  message: string;
  retryable: boolean;
}

/**
 * Tracks how far a First Mission attempt got (Goal -> Journey -> starter
 * Milestone -> starter Task), since the four creation calls are not
 * transactional (Technical Risk #2). A retry resumes from the first step
 * that didn't complete rather than recreating already-created records.
 */
export interface FirstMissionDraft {
  title: string;
  goal: GoalDto | null;
  journey: JourneyDto | null;
  milestone: MilestoneDto | null;
  task: TaskDto | null;
}

interface State {
  goals: GoalDto[];
  isLoadingGoals: boolean;
  journeysByGoalId: Record<string, JourneyDto>;
  milestonesByJourneyId: Record<string, MilestoneDto[]>;
  tasksByMilestoneId: Record<string, TaskDto[]>;
  isLoadingDetail: boolean;
  isCreatingFirstMission: boolean;
  firstMissionDraft: FirstMissionDraft | null;
  error: JourneyError | null;
}

type Action =
  | { type: 'goals/loading' }
  | { type: 'goals/loaded'; goals: GoalDto[] }
  | { type: 'detail/loading' }
  | {
      type: 'detail/loaded';
      goalId: string;
      journey: JourneyDto;
      milestones: MilestoneDto[];
      tasksByMilestoneId: Record<string, TaskDto[]>;
    }
  | { type: 'first-mission/start'; title: string }
  | { type: 'first-mission/progress'; draft: FirstMissionDraft }
  | { type: 'first-mission/success'; goal: GoalDto; journey: JourneyDto; milestone: MilestoneDto; task: TaskDto }
  | { type: 'milestone/updated'; journeyId: string; milestone: MilestoneDto }
  | { type: 'task/updated'; milestoneId: string; task: TaskDto }
  | { type: 'error'; error: JourneyError }
  | { type: 'error/clear' };

const initialState: State = {
  goals: [],
  isLoadingGoals: false,
  journeysByGoalId: {},
  milestonesByJourneyId: {},
  tasksByMilestoneId: {},
  isLoadingDetail: false,
  isCreatingFirstMission: false,
  firstMissionDraft: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'goals/loading':
      return { ...state, isLoadingGoals: true };
    case 'goals/loaded':
      return { ...state, isLoadingGoals: false, goals: action.goals };
    case 'detail/loading':
      return { ...state, isLoadingDetail: true };
    case 'detail/loaded':
      return {
        ...state,
        isLoadingDetail: false,
        journeysByGoalId: { ...state.journeysByGoalId, [action.goalId]: action.journey },
        milestonesByJourneyId: { ...state.milestonesByJourneyId, [action.journey.id]: action.milestones },
        tasksByMilestoneId: { ...state.tasksByMilestoneId, ...action.tasksByMilestoneId },
      };
    case 'first-mission/start':
      return {
        ...state,
        isCreatingFirstMission: true,
        error: null,
        firstMissionDraft: state.firstMissionDraft?.title === action.title
          ? state.firstMissionDraft
          : { title: action.title, goal: null, journey: null, milestone: null, task: null },
      };
    case 'first-mission/progress':
      return { ...state, firstMissionDraft: action.draft };
    case 'first-mission/success':
      return {
        ...state,
        isCreatingFirstMission: false,
        firstMissionDraft: null,
        goals: [action.goal, ...state.goals],
        journeysByGoalId: { ...state.journeysByGoalId, [action.goal.id]: action.journey },
        milestonesByJourneyId: { ...state.milestonesByJourneyId, [action.journey.id]: [action.milestone] },
        tasksByMilestoneId: { ...state.tasksByMilestoneId, [action.milestone.id]: [action.task] },
      };
    case 'milestone/updated': {
      const milestones = (state.milestonesByJourneyId[action.journeyId] ?? []).map((m) =>
        m.id === action.milestone.id ? action.milestone : m,
      );
      return { ...state, milestonesByJourneyId: { ...state.milestonesByJourneyId, [action.journeyId]: milestones } };
    }
    case 'task/updated': {
      const tasks = (state.tasksByMilestoneId[action.milestoneId] ?? []).map((t) =>
        t.id === action.task.id ? action.task : t,
      );
      return { ...state, tasksByMilestoneId: { ...state.tasksByMilestoneId, [action.milestoneId]: tasks } };
    }
    case 'error':
      return { ...state, isLoadingGoals: false, isLoadingDetail: false, isCreatingFirstMission: false, error: action.error };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): JourneyError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) return { kind: 'authentication', message: error.message, retryable: false };
    if (error.isRateLimited) return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable) return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError) return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface JourneyContextValue {
  state: State;
  loadGoals: () => Promise<void>;
  loadJourneyDetail: (goalId: string) => Promise<void>;
  createFirstMission: (title: string) => Promise<void>;
  retryFirstMission: () => Promise<void>;
  setMilestoneStatus: (journeyId: string, milestoneId: string, status: MilestoneDto['status']) => Promise<void>;
  setTaskStatus: (milestoneId: string, taskId: string, status: TaskDto['status']) => Promise<void>;
  clearError: () => void;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadGoals = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'goals/loading' });
    try {
      const result = await listGoals(session.accessToken);
      dispatch({ type: 'goals/loaded', goals: result.data });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const loadJourneyDetail = useCallback(
    async (goalId: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'detail/loading' });
      try {
        const journey = await getJourneyByGoal(session.accessToken, goalId);
        const milestonesResult = await listMilestones(session.accessToken, journey.id);
        const milestones = milestonesResult.data;
        const tasksByMilestoneId: Record<string, TaskDto[]> = {};
        for (const milestone of milestones) {
          const tasksResult = await listTasks(session.accessToken, milestone.id);
          tasksByMilestoneId[milestone.id] = tasksResult.data;
        }
        dispatch({ type: 'detail/loaded', goalId, journey, milestones, tasksByMilestoneId });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const runFirstMissionSteps = useCallback(
    async (startingDraft: FirstMissionDraft) => {
      if (!session.accessToken) {
        dispatch({ type: 'error', error: classifyError(new ApiError(401, 'Sign in required')) });
        return;
      }
      const accessToken = session.accessToken;
      let draft = startingDraft;

      try {
        if (!draft.goal) {
          const goal = await createGoal(accessToken, draft.title);
          draft = { ...draft, goal };
          dispatch({ type: 'first-mission/progress', draft });
        }
        if (!draft.journey) {
          const journey = await createJourney(accessToken, draft.goal!.id, draft.title);
          draft = { ...draft, journey };
          dispatch({ type: 'first-mission/progress', draft });
        }
        if (!draft.milestone) {
          const milestone = await createMilestone(accessToken, draft.journey!.id, 'Get started', 0);
          draft = { ...draft, milestone };
          dispatch({ type: 'first-mission/progress', draft });
        }
        if (!draft.task) {
          const task = await createTask(accessToken, draft.milestone!.id, 'Take the first step');
          draft = { ...draft, task };
        }

        dispatch({
          type: 'first-mission/success',
          goal: draft.goal!,
          journey: draft.journey!,
          milestone: draft.milestone!,
          task: draft.task!,
        });
      } catch (error) {
        dispatch({ type: 'first-mission/progress', draft });
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const createFirstMission = useCallback(
    async (title: string) => {
      dispatch({ type: 'first-mission/start', title });
      await runFirstMissionSteps({ title, goal: null, journey: null, milestone: null, task: null });
    },
    [runFirstMissionSteps],
  );

  const retryFirstMission = useCallback(async () => {
    if (!state.firstMissionDraft) return;
    dispatch({ type: 'first-mission/start', title: state.firstMissionDraft.title });
    await runFirstMissionSteps(state.firstMissionDraft);
  }, [state.firstMissionDraft, runFirstMissionSteps]);

  const setMilestoneStatus = useCallback(
    async (journeyId: string, milestoneId: string, status: MilestoneDto['status']) => {
      if (!session.accessToken) return;
      try {
        const milestone = await updateMilestone(session.accessToken, milestoneId, status);
        dispatch({ type: 'milestone/updated', journeyId, milestone });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const setTaskStatus = useCallback(
    async (milestoneId: string, taskId: string, status: TaskDto['status']) => {
      if (!session.accessToken) return;
      try {
        const task = await updateTask(session.accessToken, taskId, status);
        dispatch({ type: 'task/updated', milestoneId, task });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({
      state,
      loadGoals,
      loadJourneyDetail,
      createFirstMission,
      retryFirstMission,
      setMilestoneStatus,
      setTaskStatus,
      clearError,
    }),
    [state, loadGoals, loadJourneyDetail, createFirstMission, retryFirstMission, setMilestoneStatus, setTaskStatus, clearError],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyContextValue {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
}
