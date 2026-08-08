import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { LivingHall } from './LivingHall';
import { HallStage } from './HallStage';

let mockPathname = '/home';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

describe('HallStage — the application’s main, inside the room', () => {
  beforeEach(() => {
    mockPathname = '/home';
  });

  it('is the landmark the skip link targets, in every state', () => {
    render(<HallStage>{null}</HallStage>);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    // Reachable from the skip link even when there is nothing on it yet:
    // a restoring session must still have somewhere to skip to.
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('holds the member’s current business', () => {
    render(
      <HallStage>
        <h1>Where things stand</h1>
      </HallStage>,
    );
    expect(screen.getByRole('heading', { name: 'Where things stand' })).toBeInTheDocument();
  });

  it('stands inside the Hall rather than containing it', () => {
    const { container } = render(
      <LivingHall>
        <HallStage>
          <p>content</p>
        </HallStage>
      </LivingHall>,
    );
    const hall = container.querySelector('[data-aureus-hall]')!;
    const main = screen.getByRole('main');

    // The inversion this stage exists to correct: the environment must
    // never be nested inside a region of the interface.
    expect(hall.contains(main)).toBe(true);
    expect(main.contains(hall)).toBe(false);
  });

  it('lets the member’s business change without disturbing the room', () => {
    const { container, rerender } = render(
      <LivingHall>
        <HallStage>
          <p>first</p>
        </HallStage>
      </LivingHall>,
    );
    const hall = container.querySelector('[data-aureus-hall]');
    const hearth = container.querySelector('[data-presence]');
    const main = screen.getByRole('main');

    mockPathname = '/journey';
    rerender(
      <LivingHall>
        <HallStage>
          <p>second</p>
        </HallStage>
      </LivingHall>,
    );

    expect(container.querySelector('[data-aureus-hall]')).toBe(hall);
    expect(container.querySelector('[data-presence]')).toBe(hearth);
    expect(screen.getByRole('main')).toBe(main);
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <LivingHall>
        <HallStage>
          <h1>Welcome to Aureus</h1>
        </HallStage>
      </LivingHall>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
