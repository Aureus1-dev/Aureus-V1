import { render, screen } from '@testing-library/react';
import { ArrivalSessionFallback } from './ArrivalSessionFallback';

let pathname = '/welcome';
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('ArrivalSessionFallback', () => {
  it('waits inside the Hall on the arrival route, so arrival is a place before it is a page', () => {
    pathname = '/welcome';
    const { container } = render(<ArrivalSessionFallback />);

    // The room's own decorative layers are what make it the Hall rather
    // than a plain notice.
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Preparing your session')).toBeInTheDocument();
  });

  it('leaves every other member surface with the plain notice it has always shown', () => {
    pathname = '/opportunities';
    const { container } = render(<ArrivalSessionFallback />);

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1); // the spinner alone
    expect(screen.getByText('Preparing your session')).toBeInTheDocument();
  });

  it('treats nested arrival routes as arrival too', () => {
    pathname = '/welcome/resume';
    const { container } = render(<ArrivalSessionFallback />);

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
  });
});
