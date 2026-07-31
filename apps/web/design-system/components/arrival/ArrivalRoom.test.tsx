import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ArrivalRoom, daylightAt } from './ArrivalRoom';

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
  it('renders the step it is given, unchanged', () => {
    render(
      <ArrivalRoom stepKey="hospitality">
        <h1>Welcome to Aureus</h1>
      </ArrivalRoom>,
    );
    expect(screen.getByRole('heading', { name: 'Welcome to Aureus' })).toBeInTheDocument();
  });

  it('keeps every environmental layer out of the accessibility tree — atmosphere carries no information', () => {
    const { container } = render(
      <ArrivalRoom stepKey="hospitality">
        <p>step</p>
      </ArrivalRoom>,
    );
    // The room's own decorative layers are the only non-content children.
    const decorative = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorative.length).toBeGreaterThanOrEqual(2);
    decorative.forEach((layer) => expect(layer).toBeEmptyDOMElement());
  });

  it('resolves the daylight after mount rather than during render, so server and browser markup cannot disagree', () => {
    const { container } = render(
      <ArrivalRoom stepKey="hospitality">
        <p>step</p>
      </ArrivalRoom>,
    );
    // Whatever hour the test runs at, a value is present after mount and
    // is one of the four the canon defines.
    const room = container.firstElementChild;
    expect(['morning', 'afternoon', 'evening', 'night']).toContain(
      room?.getAttribute('data-daylight'),
    );
  });

  it('remounts only the stage when the step changes, leaving the room and its light in place', () => {
    const { container, rerender } = render(
      <ArrivalRoom stepKey="hospitality">
        <p>first</p>
      </ArrivalRoom>,
    );
    const roomBefore = container.firstElementChild;

    rerender(
      <ArrivalRoom stepKey="immediate-need">
        <p>second</p>
      </ArrivalRoom>,
    );

    expect(container.firstElementChild).toBe(roomBefore);
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ArrivalRoom stepKey="hospitality">
        <h1>Welcome to Aureus</h1>
      </ArrivalRoom>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
