import { act, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ArrivalScene } from './ArrivalScene';

describe('ArrivalScene', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-reduced-motion');
  });

  it('renders every line of the Opening Sequence immediately, not gated behind the animation, so assistive technology never waits on it', () => {
    render(<ArrivalScene onFinished={jest.fn()} />);
    expect(screen.getByText('Aureus.')).toBeInTheDocument();
    expect(screen.getByText('Helping people flourish. Forever.')).toBeInTheDocument();
    expect(screen.getByText('Help starts here.')).toBeInTheDocument();
    expect(screen.getByText('How can we help?')).toBeInTheDocument();
  });

  it('calls onFinished once the sequence plays out', () => {
    jest.useFakeTimers();
    const onFinished = jest.fn();
    render(<ArrivalScene onFinished={onFinished} />);
    expect(onFinished).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onFinished).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('lets a member skip straight to the end instead of waiting out the sequence', () => {
    jest.useFakeTimers();
    const onFinished = jest.fn();
    render(<ArrivalScene onFinished={onFinished} />);

    act(() => {
      screen.getByRole('button', { name: 'Skip introduction' }).click();
    });

    expect(onFinished).toHaveBeenCalledTimes(1);

    // Timers still firing after a skip must not call onFinished a second time.
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(onFinished).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('finishes immediately, without waiting on the timed sequence, when the member prefers reduced motion', () => {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    const onFinished = jest.fn();
    render(<ArrivalScene onFinished={onFinished} />);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ArrivalScene onFinished={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ArrivalScene — one continuous transformation into the Hall', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-reduced-motion');
  });

  /**
   * The sequence must not cut from a cinematic to an interface. It ends
   * in the same composition arrival then lives in, built from the same
   * components — so there is nothing to swap at the hand-off.
   */
  it('reveals the Hall’s own architecture, not a background colour change', () => {
    const { container } = render(<ArrivalScene onFinished={jest.fn()} />);
    // The architectural layers are present from the first frame; the
    // sequence lights them rather than mounting them at the end.
    expect(container.querySelector('[class*="environment"]')).toBeInTheDocument();
  });

  it('forms the same hearth the Hall keeps, rather than a separate opening graphic', () => {
    const { container } = render(<ArrivalScene onFinished={jest.fn()} />);
    // The hearth's own recess markup, from HallHearth.
    expect(container.querySelector('[data-presence]')).toBeInTheDocument();
    expect(container.querySelector('[data-presence]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps every environmental layer out of the accessibility tree during the sequence', () => {
    const { container } = render(<ArrivalScene onFinished={jest.fn()} />);
    container.querySelectorAll('[aria-hidden="true"]').forEach((layer) => {
      expect(layer.textContent).toBe('');
    });
  });

  it('completes exactly once when skipped, even as pending timers fire', () => {
    jest.useFakeTimers();
    const onFinished = jest.fn();
    render(<ArrivalScene onFinished={onFinished} />);

    act(() => {
      screen.getByRole('button', { name: 'Skip introduction' }).click();
    });
    act(() => {
      jest.advanceTimersByTime(20000);
    });

    expect(onFinished).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
