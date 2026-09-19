import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ResultArtifactCard } from './ResultArtifactCard';
import { HOUSING_MATTER } from './engine/fixtures';

describe('ResultArtifactCard', () => {
  it('is a named, durable object with status and currentness, not a chat message', () => {
    render(<ResultArtifactCard artifact={HOUSING_MATTER.artifact} />);
    expect(screen.getByRole('heading', { name: HOUSING_MATTER.artifact.name })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(HOUSING_MATTER.artifact.status))).toBeInTheDocument();
  });

  it('expands to show evidence, related matter, what remains, and done means', async () => {
    render(<ResultArtifactCard artifact={HOUSING_MATTER.artifact} />);
    expect(screen.queryByText('Evidence')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View result' }));

    expect(screen.getByText('Related matter')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    for (const item of HOUSING_MATTER.artifact.evidence) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByText('Done means')).toBeInTheDocument();
    expect(screen.getByText(HOUSING_MATTER.artifact.doneMeans)).toBeInTheDocument();
  });

  it('has no accessibility violations expanded', async () => {
    const { container } = render(<ResultArtifactCard artifact={HOUSING_MATTER.artifact} />);
    await userEvent.click(screen.getByRole('button', { name: 'View result' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
