import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ArrivalScene } from './ArrivalScene';

describe('ArrivalScene', () => {
  it('opens directly in the living Hall without the obsolete entry card', () => {
    render(<ArrivalScene onFinished={jest.fn()} />);

    expect(screen.getByText('Aureus')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Preparing a private place to begin…');
    expect(screen.queryByRole('heading', { name: 'How can we help?' })).not.toBeInTheDocument();
    expect(screen.queryByText('Type here to begin')).not.toBeInTheDocument();
    expect(screen.queryByText('Send')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip introduction/i })).not.toBeInTheDocument();
  });

  it('does not hold the member behind an introduction', () => {
    const onFinished = jest.fn();
    render(<ArrivalScene onFinished={onFinished} />);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ArrivalScene onFinished={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
