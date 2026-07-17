import { render, screen } from '@testing-library/react';
import { InterfaceProvider, useInterfaceState } from '../../../state/interface/InterfaceContext';
import { SurfaceTracker } from './SurfaceTracker';

let mockPathname = '/home';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

function CurrentSurface() {
  const { interfaceState } = useInterfaceState();
  return (
    <div>
      <span data-testid="current">{interfaceState.currentSurfaceId}</span>
      <span data-testid="history">{interfaceState.navigationHistory.join(',')}</span>
    </div>
  );
}

function renderTracker() {
  return render(
    <InterfaceProvider>
      <SurfaceTracker />
      <CurrentSurface />
    </InterfaceProvider>,
  );
}

describe('SurfaceTracker', () => {
  it('records the current surface id for a top-level route', () => {
    mockPathname = '/academy';
    renderTracker();
    expect(screen.getByTestId('current')).toHaveTextContent('academy');
  });

  it('matches a nested path under a surface to that surface', () => {
    mockPathname = '/opportunities/details';
    renderTracker();
    expect(screen.getByTestId('current')).toHaveTextContent('opportunities');
  });

  it('appends to navigation history as the pathname changes', () => {
    mockPathname = '/home';
    const { rerender } = renderTracker();
    expect(screen.getByTestId('history')).toHaveTextContent('home');

    mockPathname = '/journey';
    rerender(
      <InterfaceProvider>
        <SurfaceTracker />
        <CurrentSurface />
      </InterfaceProvider>,
    );

    expect(screen.getByTestId('current')).toHaveTextContent('journey');
    expect(screen.getByTestId('history')).toHaveTextContent('home,journey');
  });

  it('does nothing for an unrecognized pathname rather than clearing the current surface', () => {
    mockPathname = '/not-a-real-surface';
    renderTracker();
    expect(screen.getByTestId('current')).toHaveTextContent('');
  });
});
