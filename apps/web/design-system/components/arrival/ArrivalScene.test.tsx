import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ArrivalScene } from './ArrivalScene';

describe('ArrivalScene', () => {
  it('opens directly in the living Hall with the working question', () => {
    render(<ArrivalScene onFinished={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'How can we help?' })).toBeInTheDocument();
    expect(screen.getByText('Aureus')).toBeInTheDocument();
    expect(screen.queryByText('Helping people flourish. Forever.')).not.toBeInTheDocument();
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
