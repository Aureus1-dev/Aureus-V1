import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ArrivalRoom, daylightAt } from './ArrivalRoom';
import { ArrivalStage } from './ArrivalStage';

describe('daylightAt', () => {
  it.each([
    ['morning', 5],
    ['morning', 11],
    ['afternoon', 12],
    ['afternoon', 16],
    ['evening', 17],
    ['evening', 21],
    ['night', 22],
    ['night', 4],
  ])('reads %s at %i:00, following the natural rhythm of the day', (expected, hour) => {
    const date = new Date(2026, 0, 1, hour, 0, 0);
    expect(daylightAt(date)).toBe(expected);
  });
});

describe('ArrivalRoom', () => {
  it('renders whatever it is given, unchanged', () => {
    render(
      <ArrivalRoom>
        <h1>Welcome to Aureus</h1>
      </ArrivalRoom>,
    );
    expect(screen.getByRole('heading', { name: 'Welcome to Aureus' })).toBeInTheDocument();
  });

  it('keeps every environmental layer out of the accessibility tree — atmosphere carries no information', () => {
    const { container } = render(
      <ArrivalRoom>
        <p>step</p>
      </ArrivalRoom>,
    );
    const decorative = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorative.length).toBeGreaterThanOrEqual(2);
    decorative.forEach((layer) => expect(layer).toBeEmptyDOMElement());
  });

  it('resolves the daylight after mount rather than during render, so server and browser markup cannot disagree', () => {
    const { container } = render(
      <ArrivalRoom>
        <p>step</p>
      </ArrivalRoom>,
    );
    expect(['morning', 'afternoon', 'evening', 'night']).toContain(
      container.firstElementChild?.getAttribute('data-daylight'),
    );
  });

  it('renders identically on every mount, so crossing the auth boundary cannot read as a second arrival', () => {
    const first = render(
      <ArrivalRoom>
        <p>above the gate</p>
      </ArrivalRoom>,
    );
    const firstRoomClass = first.container.firstElementChild?.className;
    first.unmount();

    const second = render(
      <ArrivalRoom>
        <p>below the gate</p>
      </ArrivalRoom>,
    );
    expect(second.container.firstElementChild?.className).toBe(firstRoomClass);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ArrivalRoom>
        <ArrivalStage stepKey="hospitality">
          <h1>Welcome to Aureus</h1>
        </ArrivalStage>
      </ArrivalRoom>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ArrivalStage', () => {
  it('remounts only the stage when the step changes, leaving the room and its light in place', () => {
    function Scene({ stepKey, label }: { stepKey: string; label: string }) {
      return (
        <ArrivalRoom>
          <ArrivalStage stepKey={stepKey}>
            <p>{label}</p>
          </ArrivalStage>
        </ArrivalRoom>
      );
    }

    const { container, rerender } = render(<Scene stepKey="hospitality" label="first" />);
    const roomBefore = container.firstElementChild;
    const hearthBefore = container.querySelectorAll('[aria-hidden="true"]')[1];

    rerender(<Scene stepKey="immediate-need" label="second" />);

    expect(container.firstElementChild).toBe(roomBefore);
    expect(container.querySelectorAll('[aria-hidden="true"]')[1]).toBe(hearthBefore);
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('leaves the stage in place across a re-render that keeps the same step', () => {
    function Scene({ label }: { label: string }) {
      return (
        <ArrivalRoom>
          <ArrivalStage stepKey="immediate-need">
            <p>{label}</p>
          </ArrivalStage>
        </ArrivalRoom>
      );
    }

    const { container, rerender } = render(<Scene label="typing" />);
    const stageBefore = container.querySelector('[aria-hidden="true"] ~ div');

    rerender(<Scene label="still typing" />);

    expect(container.querySelector('[aria-hidden="true"] ~ div')).toBe(stageBefore);
  });
});
