import { render, screen } from '@testing-library/react';
import { LivingHall } from '../environment';
import { ArrivalRoom } from './ArrivalRoom';

describe('ArrivalRoom — the Hall, as arrival refers to it', () => {
  it('raises the room where none is standing', () => {
    // The root route lives above the member layout and has no Hall of
    // its own, so arrival must still be able to build one.
    const { container } = render(
      <ArrivalRoom>
        <p>content</p>
      </ArrivalRoom>,
    );
    expect(container.querySelector('[data-aureus-hall]')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('steps aside inside a Hall rather than building a second one', () => {
    // Two nested full-viewport rooms would give the member two floors,
    // two hearths, and a stage inside a stage.
    const { container } = render(
      <LivingHall>
        <ArrivalRoom>
          <p>content</p>
        </ArrivalRoom>
      </LivingHall>,
    );
    expect(container.querySelectorAll('[data-aureus-hall]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-presence]')).toHaveLength(1);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('passes the member’s business through untouched either way', () => {
    const inside = render(
      <LivingHall>
        <ArrivalRoom>
          <button type="button">Continue</button>
        </ArrivalRoom>
      </LivingHall>,
    );
    expect(inside.getByRole('button', { name: 'Continue' })).toBeInTheDocument();

    const outside = render(
      <ArrivalRoom>
        <button type="button">Continue elsewhere</button>
      </ArrivalRoom>,
    );
    expect(outside.getByRole('button', { name: 'Continue elsewhere' })).toBeInTheDocument();
  });
});
