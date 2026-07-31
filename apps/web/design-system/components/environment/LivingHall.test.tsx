import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { LivingHall } from './LivingHall';
import { HallHearth } from './HallHearth';
import { HallArchitecture } from './HallArchitecture';
import { HallThresholds } from './HallThresholds';
import { ArrivalStage } from '../arrival/ArrivalStage';

describe('LivingHall — the Hall as an environment', () => {
  it('renders the member’s current business, unchanged', () => {
    render(
      <LivingHall>
        <h1>What brings you to Aureus today?</h1>
      </LivingHall>,
    );
    expect(
      screen.getByRole('heading', { name: 'What brings you to Aureus today?' }),
    ).toBeInTheDocument();
  });

  it('carries no accessible content in the environment — the room may never hold information a member could miss', () => {
    const { container } = render(
      <LivingHall>
        <p>the only content</p>
      </LivingHall>,
    );

    // Everything decorative is hidden, and nothing hidden contains text.
    const decorative = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorative.length).toBeGreaterThan(0);
    decorative.forEach((layer) => {
      expect(layer.textContent).toBe('');
    });

    // The accessible tree is exactly the stage content.
    expect(container.textContent).toBe('the only content');
  });

  it('is not a card inside a page — it declares no wrapper of its own around the environment', () => {
    const { container } = render(
      <LivingHall>
        <p>content</p>
      </LivingHall>,
    );
    const hall = container.firstElementChild!;
    // The Hall is the outermost element rendered; nothing wraps it, so
    // whatever page it is placed in cannot show through around it.
    expect(hall).toBe(container.firstChild);
    expect(container.children).toHaveLength(1);
  });

  it('renders a complete, deliberate composition before the member’s hour is known', () => {
    // The server cannot read the member's clock. Whatever it renders must
    // already be a finished room, never an unlit one waiting on JS.
    const { container } = render(
      <LivingHall time="afternoon">
        <p>content</p>
      </LivingHall>,
    );
    expect(container.firstElementChild).toHaveAttribute('data-time', 'afternoon');
  });

  it.each(['morning', 'afternoon', 'evening', 'night'] as const)(
    'expresses %s across the whole environment via a single state on the room',
    (time) => {
      const { container } = render(
        <LivingHall time={time}>
          <p>content</p>
        </LivingHall>,
      );
      // One attribute drives architecture, thresholds and hearth together,
      // rather than each layer resolving the hour independently.
      expect(container.firstElementChild).toHaveAttribute('data-time', time);
    },
  );

  it('hosts the arrival stage without the stage needing to know about the room', () => {
    const { rerender } = render(
      <LivingHall>
        <ArrivalStage stepKey="one">
          <p>first</p>
        </ArrivalStage>
      </LivingHall>,
    );
    expect(screen.getByText('first')).toBeInTheDocument();

    rerender(
      <LivingHall>
        <ArrivalStage stepKey="two">
          <p>second</p>
        </ArrivalStage>
      </LivingHall>,
    );
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <LivingHall>
        <h1>Welcome to Aureus</h1>
      </LivingHall>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('HallHearth — the universal light, not the Member’s Mark', () => {
  /**
   * AUREUS-013: the Member's Mark is personal, unique to one member, and
   * revealed only when they create an account. The hearth is universal,
   * identical for everyone, and present before anyone has an account. If
   * these ever merge, a member meets "their" Mark twice and the second
   * one means nothing.
   */
  it('is named and typed as the house’s hearth, never as a Mark', () => {
    const source = readFileSync(`${__dirname}/HallHearth.tsx`, 'utf8');
    // No member-Mark vocabulary leaks into the hearth's own implementation.
    expect(source).not.toMatch(/MemberMark|memberMark|personalMark/);
    expect(HallHearth.name).toBe('HallHearth');
  });

  it('carries no member identity — it renders identically with no props at all', () => {
    const first = render(<HallHearth />).container.innerHTML;
    const second = render(<HallHearth />).container.innerHTML;
    // Universal: two members, two renders, one light. A Mark could never
    // satisfy this test, which is exactly the point.
    expect(first).toBe(second);
  });

  it('is entirely decorative', () => {
    const { container } = render(<HallHearth />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).toBe('');
  });

  it('rests by default — arrival has no live Steward state to justify anything more', () => {
    const { container } = render(<HallHearth />);
    expect(container.firstElementChild).toHaveAttribute('data-presence', 'resting');
  });

  it.each(['resting', 'listening', 'thinking', 'speaking', 'attention'] as const)(
    'expresses the Steward’s %s presence within the hearth rather than beside it',
    (presence) => {
      const { container } = render(<HallHearth presence={presence} />);
      expect(container.firstElementChild).toHaveAttribute('data-presence', presence);
    },
  );
});

describe('HallArchitecture and HallThresholds', () => {
  it('hold no accessible content whatsoever', () => {
    const arch = render(<HallArchitecture />).container;
    expect(arch.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(arch.textContent).toBe('');

    const thresholds = render(<HallThresholds />).container;
    expect(thresholds.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(thresholds.textContent).toBe('');
  });

  it('offers no interactive targets — thresholds are architecture in this phase, not navigation', () => {
    const { container } = render(<HallThresholds />);
    expect(container.querySelectorAll('a, button, [role="link"], [role="button"]')).toHaveLength(0);
  });
});
