import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { PlaceProvider } from './PlaceProvider';
import { HallThresholds } from './HallThresholds';

let mockPathname = '/home';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

function renderAfterVisiting(paths: string[]) {
  mockPathname = paths[0];
  const view = render(
    <PlaceProvider>
      <HallThresholds />
    </PlaceProvider>,
  );
  for (const path of paths.slice(1)) {
    mockPathname = path;
    view.rerender(
      <PlaceProvider>
        <HallThresholds />
      </PlaceProvider>,
    );
  }
  return view;
}

describe('HallThresholds — architecture that is navigation', () => {
  beforeEach(() => {
    mockPathname = '/home';
  });

  it('says nothing to a member who has not been anywhere yet', () => {
    // AUREA-002 §ORIENTATION: "Members are never given a feature tour…
    // The Steward introduces spaces only when they become relevant." Six
    // doorways on arrival would be a menu wearing an architectural
    // costume.
    const { container } = renderAfterVisiting(['/home']);
    // The six openings are always there — a Hall with two doors is not
    // the centre of anything — but none of them is a way anywhere yet,
    // so none is announced and none is a link.
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('[class*="bay"]')).toHaveLength(6);
  });

  it('opens a way back to a place the member has actually been', () => {
    // Standing in the Hall, so no "way home" entry — only history.
    const { container } = renderAfterVisiting(['/home', '/journey', '/home']);
    const nav = screen.getByRole('navigation', { name: 'Ways through' });
    expect(nav).toBeInTheDocument();
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'The Workshop' })).toHaveAttribute('href', '/journey');
    // And the other five openings are still masonry.
    expect(container.querySelectorAll('[class*="bay"]')).toHaveLength(6);
  });

  it('remembers the two most recent, most recent first', () => {
    const { container } = renderAfterVisiting([
      '/home',
      '/journey',
      '/resources',
      '/opportunities',
      '/home',
    ]);
    const names = [...container.querySelectorAll('a')].map((a) => a.textContent);
    // Which two are lit is decided by recency; *where* they are is decided
    // by the architecture, since each place has its own bay around the
    // drum and a doorway does not move because you used it lately.
    expect(new Set(names)).toEqual(new Set(['The Opportunity Center', 'The Library']));
  });

  it('never offers a way back to the room the member is standing in', () => {
    const { container } = renderAfterVisiting(['/home', '/journey', '/resources', '/journey']);
    const names = [...container.querySelectorAll('a')].map((a) => a.textContent);
    expect(names).not.toContain('The Workshop');
    // The way home is always offered from anywhere that is not the Hall,
    // alongside the most recent other place they have been.
    expect(new Set(names)).toEqual(new Set(['The Hall', 'The Library']));
  });

  it('always offers the way home from anywhere that is not the Hall', () => {
    // AUREUS-005 non-negotiable: "Members should always know how to
    // return home." With the navigation rail gone, the architecture is
    // what says so — including on a member's very first departure, when
    // there is no history to return through yet.
    const { container } = renderAfterVisiting(['/home', '/journey']);
    const names = [...container.querySelectorAll('a')].map((a) => a.textContent);
    expect(names).toContain('The Hall');
    expect(screen.getByRole('link', { name: 'The Hall' })).toHaveAttribute('href', '/home');
  });

  it('treats housekeeping as nowhere — a member does not walk to their settings', () => {
    const { container } = renderAfterVisiting(['/home', '/settings', '/home']);
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('every way through is a real link with a real name', () => {
    // An interactive doorway must be perceivable, focusable and named:
    // decorated `div`s would make the architecture unreachable by
    // keyboard and invisible to a screen reader.
    renderAfterVisiting(['/home', '/community', '/home']);
    const link = screen.getByRole('link', { name: 'The Circle' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/community');
  });

  it('has no accessibility violations, decorative or navigational', async () => {
    const inert = renderAfterVisiting(['/home']);
    expect(await axe(inert.container)).toHaveNoViolations();

    const active = renderAfterVisiting(['/home', '/plans', '/home']);
    expect(await axe(active.container)).toHaveNoViolations();
  });
});
