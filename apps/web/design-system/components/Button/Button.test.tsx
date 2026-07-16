import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and responds to clicks', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Continue</Button>);
    const button = screen.getByRole('button', { name: 'Continue' });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Continue</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
