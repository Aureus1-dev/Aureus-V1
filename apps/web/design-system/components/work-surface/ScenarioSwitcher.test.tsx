import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import { useTheme } from '../../theme';

jest.mock('../../theme', () => ({ useTheme: jest.fn() }));

const mockedUseTheme = useTheme as jest.Mock;

describe('ScenarioSwitcher', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({ motionPreference: 'system', setMotionPreference: jest.fn() });
  });

  it('stays closed and out of the way until a reviewer opens it', () => {
    render(<ScenarioSwitcher onSelect={jest.fn()} onTriggerError={jest.fn()} />);
    expect(screen.queryByText(/Slice 0 prototype/)).not.toBeInTheDocument();
  });

  it('discloses that it is a prototype fixture, not real orchestration', async () => {
    render(<ScenarioSwitcher onSelect={jest.fn()} onTriggerError={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Prototype' }));
    expect(screen.getByText(/scripted fixture state for review/)).toBeInTheDocument();
  });

  it('lets a reviewer jump directly to any required Slice 0 scenario', async () => {
    const onSelect = jest.fn();
    render(<ScenarioSwitcher onSelect={onSelect} onTriggerError={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Prototype' }));

    await userEvent.click(screen.getByRole('button', { name: 'Returning · several matters' }));
    expect(onSelect).toHaveBeenCalledWith('returning-several');
  });

  it('toggles reduced motion through the app’s real motion preference, not a local fake', async () => {
    const setMotionPreference = jest.fn();
    mockedUseTheme.mockReturnValue({ motionPreference: 'system', setMotionPreference });
    render(<ScenarioSwitcher onSelect={jest.fn()} onTriggerError={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Prototype' }));

    await userEvent.click(screen.getByRole('checkbox', { name: 'Reduced motion' }));
    expect(setMotionPreference).toHaveBeenCalledWith('reduced');
  });

  it('reflects an already-reduced motion preference', async () => {
    mockedUseTheme.mockReturnValue({ motionPreference: 'reduced', setMotionPreference: jest.fn() });
    render(<ScenarioSwitcher onSelect={jest.fn()} onTriggerError={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Prototype' }));

    expect(screen.getByRole('checkbox', { name: 'Reduced motion' })).toBeChecked();
  });

  it('has no accessibility violations when open', async () => {
    // Wrapped in a landmark here only because this fragment is rendered in
    // isolation in this test — in the real route it always sits inside the
    // page's own landmark structure (see WorkSurfacePrototype).
    const { container } = render(
      <main>
        <ScenarioSwitcher onSelect={jest.fn()} onTriggerError={jest.fn()} />
      </main>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Prototype' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
