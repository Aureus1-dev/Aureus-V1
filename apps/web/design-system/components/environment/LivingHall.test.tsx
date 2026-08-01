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

  /**
   * The Hall is now mounted once, in the member layout, for the life of
   * the session. AUREUS-201: "The Hall remains present throughout the
   * member experience. Only the current interaction changes." Before
   * this, the room was rebuilt on every navigation — which is what made
   * it read as a background image rather than a place.
   */
  it('survives the member’s business changing entirely — the room is not rebuilt around them', () => {
    const { container, rerender } = render(
      <LivingHall>
        <p>the first thing</p>
      </LivingHall>,
    );
    const hallBefore = container.querySelector('[data-aureus-hall]');
    const hearthBefore = container.querySelector('[data-presence]');

    rerender(
      <LivingHall>
        <section>
          <h2>something else entirely</h2>
        </section>
      </LivingHall>,
    );

    // Identity, not equality: the very same DOM nodes, never replaced.
    expect(container.querySelector('[data-aureus-hall]')).toBe(hallBefore);
    expect(container.querySelector('[data-presence]')).toBe(hearthBefore);
    expect(screen.getByRole('heading', { name: 'something else entirely' })).toBeInTheDocument();
  });

  /**
   * Founder ruling: "The Hearth shall never become fully obscured.
   * Loading states. Navigation. Dialogs. Toasts. Panels. Errors.
   * Transitions. All shall preserve visual continuity with the Hearth."
   *
   * Held structurally rather than by convention — the hearth is a
   * *sibling* of the stage and precedes it, so no amount of content and
   * no route can render over it. These assert the structure that makes
   * that true, because an invariant nobody can accidentally break is the
   * only kind that survives twenty other surfaces.
   */
  it('keeps the hearth beside the member’s business, never behind it', () => {
    const { container } = render(
      <LivingHall>
        <p>content</p>
      </LivingHall>,
    );
    const hearth = container.querySelector('[data-presence]')!;
    const content = screen.getByText('content');

    // The stage never contains the hearth, so it can never cover it.
    expect(hearth.contains(content)).toBe(false);
    expect(content.contains(hearth)).toBe(false);
    // And the hearth is drawn first, so it is above in the room, not behind.
    expect(hearth.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('bounds the stage rather than letting it grow over the hearth', () => {
    const stage = readFileSync(`${__dirname}/HallStage.module.css`, 'utf8');
    // `flex: 0 1 auto` — may shrink, never grows — plus `min-height: 0`
    // is what makes a long surface scroll *within* the room instead of
    // pushing the hearth off the top of it.
    expect(stage).toMatch(/flex:\s*0 1 auto/);
    expect(stage).toMatch(/min-height:\s*0/);
    expect(stage).toMatch(/overflow-y:\s*auto/);
    // Never an overlay: an absolutely positioned stage could cover the hearth.
    expect(stage).not.toMatch(/position:\s*(absolute|fixed)/);
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
