import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Room } from './Room';

describe('Room', () => {
  it('renders the title, optional description, header action, and children', () => {
    render(
      <Room title="Journey Review" description="Everything you're working toward." headerAction={<button>Back</button>}>
        <p>Room content</p>
      </Room>,
    );
    expect(screen.getByRole('heading', { name: 'Journey Review' })).toBeInTheDocument();
    expect(screen.getByText("Everything you're working toward.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByText('Room content')).toBeInTheDocument();
  });

  it('omits the description when none is given', () => {
    render(<Room title="Planning Table">content</Room>);
    expect(screen.getByRole('heading', { name: 'Planning Table' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Room title="Journey Review" description="Everything you're working toward.">
        <p>Room content</p>
      </Room>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
