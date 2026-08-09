import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ArrivalRoom, daylightAt } from './ArrivalRoom';
import { ArrivalStage } from './ArrivalStage';

describe('daylightAt', () => {
  it.each([
    ['deep-night', 2],
    ['predawn', 5],
    ['dawn', 7],
    ['morning', 9],
    ['noon', 12],
    ['afternoon', 15],
    ['golden-hour', 18],
    ['evening', 20],
    ['late-night', 23],
  ])('reads %s at %i:00', (expected, hour) => {
    expect(daylightAt(new Date(2026, 0, 1, hour))).toBe(expected);
  });
});

describe('ArrivalRoom', () => {
  it('renders the member step unchanged inside the Hall', () => {
    render(
      <ArrivalRoom>
        <h1>Welcome to Aureus</h1>
      </ArrivalRoom>,
    );
    expect(screen.getByRole('heading', { name: 'Welcome to Aureus' })).toBeInTheDocument();
  });

  it('keeps the environment out of the accessibility tree', () => {
    const { container } = render(
      <ArrivalRoom>
        <p>step</p>
      </ArrivalRoom>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ArrivalRoom>
        <ArrivalStage stepKey="need">
          <h1>How can we help?</h1>
        </ArrivalStage>
      </ArrivalRoom>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ArrivalStage', () => {
  it('keeps the room mounted while the working step changes', () => {
    function Scene({ stepKey, label }: { stepKey: string; label: string }) {
      return (
        <ArrivalRoom>
          <ArrivalStage stepKey={stepKey}>
            <p>{label}</p>
          </ArrivalStage>
        </ArrivalRoom>
      );
    }
    const { container, rerender } = render(<Scene stepKey="one" label="first" />);
    const roomBefore = container.firstElementChild;
    rerender(<Scene stepKey="two" label="second" />);
    expect(container.firstElementChild).toBe(roomBefore);
    expect(screen.getByText('second')).toBeInTheDocument();
  });
});
