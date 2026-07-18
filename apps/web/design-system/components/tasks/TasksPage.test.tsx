import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { TasksProvider } from '../../../state/tasks/TasksContext';
import { TasksPage } from './TasksPage';
import * as tasksApi from '../../../lib/api/tasks';
import type { TaskDto } from '../../../lib/api/tasks';

jest.mock('../../../lib/api/tasks');

const mockedApi = tasksApi as jest.Mocked<typeof tasksApi>;

function makeTask(o: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 't-1', title: 'Take the first step', status: 'PENDING', priority: 'MEDIUM', position: 0,
    milestoneId: 'm-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderPage() {
  return render(
    <SessionProvider>
      <TasksProvider>
        <SignedInAs>
          <TasksPage />
        </SignedInAs>
      </TasksProvider>
    </SessionProvider>,
  );
}

describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loaded list of tasks', async () => {
    mockedApi.listMyTasks.mockResolvedValue({
      data: [makeTask()], total: 1, page: 1, limit: 50, totalPages: 1,
    });

    renderPage();

    expect(await screen.findByText('Take the first step')).toBeInTheDocument();
    expect(screen.getByText('Medium priority')).toBeInTheDocument();
  });

  it('shows an empty state when there are no tasks', async () => {
    mockedApi.listMyTasks.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 });

    renderPage();

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  });

  it('changes a task status', async () => {
    mockedApi.listMyTasks.mockResolvedValue({ data: [makeTask()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.updateTask.mockResolvedValue(makeTask({ status: 'COMPLETED' }));

    renderPage();
    await screen.findByText('Take the first step');

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Completed');

    await waitFor(() => expect(mockedApi.updateTask).toHaveBeenCalledWith('token-123', 't-1', 'COMPLETED'));
  });

  it('shows a sign-in prompt when unauthenticated', () => {
    render(
      <SessionProvider>
        <TasksProvider>
          <TasksPage />
        </TasksProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to view your tasks')).toBeInTheDocument();
    expect(mockedApi.listMyTasks).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedApi.listMyTasks.mockResolvedValue({ data: [makeTask()], total: 1, page: 1, limit: 50, totalPages: 1 });
    const { container } = renderPage();
    await screen.findByText('Take the first step');

    expect(await axe(container)).toHaveNoViolations();
  });
});
