import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { HomeHall } from './HomeHall';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());

describe('HomeHall — Home with no active mission is the Hall itself', () => {
  it('renders the Hall as the surface, not a card inside one', () => {
    const { container } = render(<HomeHall />);
    // The Hall marks itself so the shell can go full-bleed around it.
    expect(container.querySelector('[data-aureus-hall]')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('data-aureus-hall');
  });

  it('opens with the question Aureus always opens with', () => {
    render(<HomeHall />);
    expect(screen.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeInTheDocument();
  });

  it('offers exactly one input affordance — no dashboard cards, no room menu', () => {
    const { container } = render(<HomeHall />);
    expect(container.querySelectorAll('input, textarea')).toHaveLength(1);
    // One action: submit. Nothing else competing for the member's attention.
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('keeps the Steward resting — nothing has been asked yet', () => {
    const { container } = render(<HomeHall />);
    expect(container.querySelector('[data-presence]')).toHaveAttribute('data-presence', 'resting');
  });

  it('carries what the member typed into arrival rather than discarding it', () => {
    render(<HomeHall />);
    fireEvent.change(screen.getByLabelText(/what brings you here today/i), {
      target: { value: 'I lost my job and I need help with rent' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(push).toHaveBeenCalledWith(
      `/welcome?need=${encodeURIComponent('I lost my job and I need help with rent')}`,
    );
  });

  it('does nothing on an empty submission', () => {
    render(<HomeHall />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(push).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HomeHall />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
