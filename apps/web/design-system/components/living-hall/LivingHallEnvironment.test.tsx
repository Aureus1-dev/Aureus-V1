import { act, render } from '@testing-library/react';
import { LivingHallEnvironment } from './LivingHallEnvironment';

describe('LivingHallEnvironment', () => {
  afterEach(() => document.documentElement.removeAttribute('data-reduced-motion'));

  it('is atmosphere only and wakes without blocking the interface', () => {
    jest.useFakeTimers();
    const { container } = render(<LivingHallEnvironment />);
    const environment = container.firstElementChild;
    expect(environment).toHaveAttribute('aria-hidden', 'true');
    expect(environment).toHaveAttribute('data-awake', 'false');
    act(() => jest.advanceTimersByTime(50));
    expect(environment).toHaveAttribute('data-awake', 'true');
    jest.useRealTimers();
  });

  it('wakes immediately when reduced motion is requested', () => {
    jest.useFakeTimers();
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    const { container } = render(<LivingHallEnvironment />);
    act(() => jest.advanceTimersByTime(0));
    expect(container.firstElementChild).toHaveAttribute('data-awake', 'true');
    jest.useRealTimers();
  });
});
