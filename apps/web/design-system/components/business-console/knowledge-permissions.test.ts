import { knowledgePermissions } from './knowledge-permissions';

describe('knowledgePermissions', () => {
  it('keeps viewers read-only', () => {
    expect(knowledgePermissions('VIEWER', ['BUSINESS_REPRESENTATIVE'])).toEqual({
      canEdit: false,
      canReview: false,
    });
  });

  it('allows operators to prepare knowledge but not approve it', () => {
    expect(knowledgePermissions('OPERATOR', ['BUSINESS_REPRESENTATIVE'])).toEqual({
      canEdit: true,
      canReview: false,
    });
  });

  it('allows accountable tenant managers to review', () => {
    expect(knowledgePermissions('MANAGER', ['BUSINESS_REPRESENTATIVE'])).toEqual({
      canEdit: true,
      canReview: true,
    });
  });
});
