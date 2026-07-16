import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { OpportunityTabs, type OpportunityTab } from './OpportunityTabs';

const TABS: OpportunityTab[] = [
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
  { id: 'recommended', label: 'Recommended' },
];

describe('OpportunityTabs', () => {
  it('marks the active tab as selected and exposes the correct panel linkage', () => {
    render(<OpportunityTabs tabs={TABS} activeId="saved" onChange={jest.fn()} />);

    const savedTab = screen.getByRole('tab', { name: 'Saved' });
    expect(savedTab).toHaveAttribute('aria-selected', 'true');
    expect(savedTab).toHaveAttribute('aria-controls', 'opportunity-panel-saved');
    expect(screen.getByRole('tab', { name: 'Search' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when a tab is clicked', async () => {
    const onChange = jest.fn();
    render(<OpportunityTabs tabs={TABS} activeId="search" onChange={onChange} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Recommended' }));
    expect(onChange).toHaveBeenCalledWith('recommended');
  });

  it('supports left/right arrow key navigation between tabs', async () => {
    const onChange = jest.fn();
    render(<OpportunityTabs tabs={TABS} activeId="search" onChange={onChange} />);

    screen.getByRole('tab', { name: 'Search' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('saved');

    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('search');
  });

  it('has no accessibility violations', async () => {
    // Render alongside the panels each tab's `aria-controls` references,
    // matching real usage (OpportunityCenter renders tabs and panels
    // together) — axe flags aria-controls pointing at a nonexistent id.
    const { container } = render(
      <>
        <OpportunityTabs tabs={TABS} activeId="search" onChange={jest.fn()} />
        {TABS.map((tab) => (
          <div key={tab.id} role="tabpanel" id={`opportunity-panel-${tab.id}`} aria-labelledby={`opportunity-tab-${tab.id}`} />
        ))}
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
