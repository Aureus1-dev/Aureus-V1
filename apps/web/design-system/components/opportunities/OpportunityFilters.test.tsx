import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { OpportunityFilters, sortOptionToParams } from './OpportunityFilters';

describe('OpportunityFilters', () => {
  it('submits a typed search term', async () => {
    const onChange = jest.fn();
    render(<OpportunityFilters value={{}} onChange={onChange} />);

    await userEvent.type(screen.getByPlaceholderText('Search opportunities...'), 'grant');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).toHaveBeenCalledWith({ q: 'grant' });
  });

  it('changes category immediately on selection', async () => {
    const onChange = jest.fn();
    render(<OpportunityFilters value={{}} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'GRANT');

    expect(onChange).toHaveBeenCalledWith({ category: 'GRANT' });
  });

  it('changes sort immediately on selection', async () => {
    const onChange = jest.fn();
    render(<OpportunityFilters value={{}} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'confidence');

    expect(onChange).toHaveBeenCalledWith({ sort: 'confidence' });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OpportunityFilters value={{}} onChange={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('sortOptionToParams', () => {
  it('maps "newest" and undefined to no explicit sort (the backend default)', () => {
    expect(sortOptionToParams(undefined)).toEqual({});
    expect(sortOptionToParams('newest')).toEqual({});
  });

  it('maps "deadline" to ascending order (soonest first)', () => {
    expect(sortOptionToParams('deadline')).toEqual({ sortBy: 'deadline', sortOrder: 'asc' });
  });

  it('maps "confidence" and "freshness" to descending order (most first)', () => {
    expect(sortOptionToParams('confidence')).toEqual({ sortBy: 'confidence', sortOrder: 'desc' });
    expect(sortOptionToParams('freshness')).toEqual({ sortBy: 'freshness', sortOrder: 'desc' });
  });
});
