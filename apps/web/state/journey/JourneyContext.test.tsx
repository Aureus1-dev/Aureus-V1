import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { JourneyProvider, useJourney } from './JourneyContext';
import * as goalsApi from '../../lib/api/goals';
import * as journeysApi from '../../lib/api/journeys';
import * as milestonesApi from '../../lib/api/milestones';
import * as tasksApi from '../../lib/api/tasks';
import { ApiError } from '../../lib/api/errors';

jest.mock('../../lib/api/goals');
jest.mock('../../lib/api/journeys');
jest.mock('../../lib/api/milestones');
jest.mock('../../lib/api/tasks');

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedJourneys = journeysApi as jest.Mocked<typeof journeysApi>;
const mockedMilestones = milestonesApi as jest.Mocked<typeof milestonesApi>;
const mockedTasks = tasksApi as jest.Mocked<typeof tasksApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useJourney> & { setToken: (t: string) => void }) => void }) {
  const journey = useJourney();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...journey,
      setToken: (token: string) => setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useJourney> & { setToken: (t: string) => void };
  render(
    <SessionProvider>
      <JourneyProvider>
        <Harness onReady={(value) => (api = value)} />
      </JourneyProvider>
    </SessionProvider>,
  );
  return () => api;
}

const goal = { id: 'goal-1', title: 'Find a job', status: 'ACTIVE' as const, userId: 'member-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const journeyDto = { id: 'journey-1', title: 'Find a job', status: 'ACTIVE' as const, goalId: 'goal-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const milestone = { id: 'milestone-1', title: 'Get started', status: 'PENDING' as const, position: 0, journeyId: 'journey-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const task = { id: 'task-1', title: 'Take the first step', status: 'PENDING' as const, priority: 'MEDIUM' as const, position: 0, milestoneId: 'milestone-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };

describe('JourneyContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the full First Mission chain in order', async () => {
    mockedGoals.createGoal.mockResolvedValue(goal);
    mockedJourneys.createJourney.mockResolvedValue(journeyDto);
    mockedMilestones.createMilestone.mockResolvedValue(milestone);
    mockedTasks.createTask.mockResolvedValue(task);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().createFirstMission('Find a job');
    });

    expect(mockedGoals.createGoal).toHaveBeenCalledWith('token-123', 'Find a job');
    expect(mockedJourneys.createJourney).toHaveBeenCalledWith('token-123', 'goal-1', 'Find a job');
    expect(mockedMilestones.createMilestone).toHaveBeenCalledWith('token-123', 'journey-1', 'Get started', 0);
    expect(mockedTasks.createTask).toHaveBeenCalledWith('token-123', 'milestone-1', 'Take the first step');

    expect(getApi().state.goals).toEqual([goal]);
    expect(getApi().state.journeysByGoalId['goal-1']).toEqual(journeyDto);
    expect(getApi().state.milestonesByJourneyId['journey-1']).toEqual([milestone]);
    expect(getApi().state.tasksByMilestoneId['milestone-1']).toEqual([task]);
    expect(getApi().state.isCreatingFirstMission).toBe(false);
    expect(getApi().state.firstMissionDraft).toBeNull();
  });

  it('resumes from the failed step on retry instead of recreating earlier records', async () => {
    mockedGoals.createGoal.mockResolvedValue(goal);
    mockedJourneys.createJourney.mockRejectedValueOnce(new ApiError(503, 'The service is temporarily unavailable'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().createFirstMission('Find a job');
    });

    expect(mockedGoals.createGoal).toHaveBeenCalledTimes(1);
    expect(getApi().state.error?.kind).toBe('unavailable');
    expect(getApi().state.firstMissionDraft?.goal).toEqual(goal);
    expect(getApi().state.firstMissionDraft?.journey).toBeNull();

    mockedJourneys.createJourney.mockResolvedValue(journeyDto);
    mockedMilestones.createMilestone.mockResolvedValue(milestone);
    mockedTasks.createTask.mockResolvedValue(task);

    await act(async () => {
      await getApi().retryFirstMission();
    });

    // Goal is not recreated — only the steps that hadn't completed run again.
    expect(mockedGoals.createGoal).toHaveBeenCalledTimes(1);
    expect(mockedJourneys.createJourney).toHaveBeenCalledTimes(2);
    expect(getApi().state.goals).toEqual([goal]);
    expect(getApi().state.firstMissionDraft).toBeNull();
    expect(getApi().state.error).toBeNull();
  });

  it('loads goals for the signed-in member', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [goal], total: 1, page: 1, limit: 20, totalPages: 1 });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadGoals();
    });

    expect(getApi().state.goals).toEqual([goal]);
  });

  it('loads a journey detail with nested milestones and tasks', async () => {
    mockedJourneys.getJourneyByGoal.mockResolvedValue(journeyDto);
    mockedMilestones.listMilestones.mockResolvedValue({ data: [milestone], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedTasks.listTasks.mockResolvedValue({ data: [task], total: 1, page: 1, limit: 100, totalPages: 1 });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadJourneyDetail('goal-1');
    });

    expect(getApi().state.journeysByGoalId['goal-1']).toEqual(journeyDto);
    expect(getApi().state.milestonesByJourneyId['journey-1']).toEqual([milestone]);
    expect(getApi().state.tasksByMilestoneId['milestone-1']).toEqual([task]);
  });

  it('updates milestone and task status', async () => {
    const completedMilestone = { ...milestone, status: 'COMPLETED' as const };
    const completedTask = { ...task, status: 'COMPLETED' as const };
    mockedJourneys.getJourneyByGoal.mockResolvedValue(journeyDto);
    mockedMilestones.listMilestones.mockResolvedValue({ data: [milestone], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedTasks.listTasks.mockResolvedValue({ data: [task], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedMilestones.updateMilestone.mockResolvedValue(completedMilestone);
    mockedTasks.updateTask.mockResolvedValue(completedTask);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadJourneyDetail('goal-1');
    });

    await act(async () => {
      await getApi().setMilestoneStatus('journey-1', 'milestone-1', 'COMPLETED');
    });
    expect(getApi().state.milestonesByJourneyId['journey-1']).toEqual([completedMilestone]);

    await act(async () => {
      await getApi().setTaskStatus('milestone-1', 'task-1', 'COMPLETED');
    });
    expect(getApi().state.tasksByMilestoneId['milestone-1']).toEqual([completedTask]);
  });

  it('does not attempt anything without authentication', async () => {
    const getApi = renderHarness();
    await act(async () => {
      await getApi().createFirstMission('Find a job');
    });

    expect(mockedGoals.createGoal).not.toHaveBeenCalled();
    expect(getApi().state.error?.kind).toBe('authentication');
  });
});
