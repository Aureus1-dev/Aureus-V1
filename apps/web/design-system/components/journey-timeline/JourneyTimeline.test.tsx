import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { JourneyTimeline } from './JourneyTimeline';

describe('JourneyTimeline', () => {
  it('renders children in the timeline layout', () => {
    render(
      <JourneyTimeline>
        <p>Journey one</p>
        <p>Journey two</p>
      </JourneyTimeline>,
    );
    expect(screen.getByText('Journey one')).toBeInTheDocument();
    expect(screen.getByText('Journey two')).toBeInTheDocument();
  });

  it('shows a loading state and hides children while loading', () => {
    render(
      <JourneyTimeline loading loadingLabel="Loading your journey">
        <p>Journey one</p>
      </JourneyTimeline>,
    );
    expect(screen.getByText('Loading your journey')).toBeInTheDocument();
    expect(screen.queryByText('Journey one')).not.toBeInTheDocument();
  });

  it('shows an error state', () => {
    render(
      <JourneyTimeline error={{ title: 'Connection interrupted' }}>
        <p>Journey one</p>
      </JourneyTimeline>,
    );
    expect(screen.getByText('Connection interrupted')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(
      <JourneyTimeline isEmpty emptyTitle="No journeys yet">
        <p>Journey one</p>
      </JourneyTimeline>,
    );
    expect(screen.getByText('No journeys yet')).toBeInTheDocument();
    expect(screen.queryByText('Journey one')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <JourneyTimeline>
        <p>Journey one</p>
      </JourneyTimeline>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
