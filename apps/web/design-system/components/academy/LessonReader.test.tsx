import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { LessonReader } from './LessonReader';
import type { LessonDto, LessonProgressDto } from '../../../lib/api/academy';

const lesson: LessonDto = {
  id: 'lesson-1', moduleId: 'mod-1', title: 'Building a Budget', content: 'A budget is a plan for your money.',
  position: 2, estimatedDurationMinutes: 10, relatedArticleId: null, createdAt: 'x', updatedAt: 'x',
};

describe('LessonReader', () => {
  it('shows the lesson content and a reflection prompt, never a scored quiz', () => {
    render(
      <LessonReader lesson={lesson} progress={null} canTrack={false} isUpdating={false} onStart={jest.fn()} onComplete={jest.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Building a Budget' })).toBeInTheDocument();
    expect(screen.getByText('A budget is a plan for your money.')).toBeInTheDocument();
    expect(screen.queryByText(/knowledge check/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument();
  });

  it('marks a lesson as started once, when tracking is enabled and it has not started yet', () => {
    const onStart = jest.fn();
    render(
      <LessonReader lesson={lesson} progress={null} canTrack isUpdating={false} onStart={onStart} onComplete={jest.fn()} />,
    );

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('never re-requests a start for a lesson already in progress or completed', () => {
    const onStart = jest.fn();
    const progress: LessonProgressDto = {
      id: 'p-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'IN_PROGRESS', startedAt: 'x', completedAt: null, updatedAt: 'x',
    };
    render(
      <LessonReader lesson={lesson} progress={progress} canTrack isUpdating={false} onStart={onStart} onComplete={jest.fn()} />,
    );

    expect(onStart).not.toHaveBeenCalled();
  });

  it('lets the member mark the lesson complete', async () => {
    const onComplete = jest.fn();
    render(
      <LessonReader lesson={lesson} progress={null} canTrack isUpdating={false} onStart={jest.fn()} onComplete={onComplete} />,
    );

    await userEvent.click(screen.getByRole('button', { name: "I've completed this lesson" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows a completed acknowledgement instead of the action once completed', () => {
    const progress: LessonProgressDto = {
      id: 'p-1', enrollmentId: 'enr-1', lessonId: 'lesson-1', status: 'COMPLETED', startedAt: 'x', completedAt: 'x', updatedAt: 'x',
    };
    render(
      <LessonReader lesson={lesson} progress={progress} canTrack isUpdating={false} onStart={jest.fn()} onComplete={jest.fn()} />,
    );

    expect(screen.getByText(/completed this lesson/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "I've completed this lesson" })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <LessonReader lesson={lesson} progress={null} canTrack isUpdating={false} onStart={jest.fn()} onComplete={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
