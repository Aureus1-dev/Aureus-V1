import { businessOnboardingStep } from './onboarding-progress';

const complete = {
  slug: 'river-city-kitchens',
  cities: 'Dayton',
  hours: 'Weekdays',
  contactValue: '+1 555 0100',
  escalationEmail: 'human@example.com',
};

describe('businessOnboardingStep', () => {
  it('does not skip missing setup stages', () => {
    expect(businessOnboardingStep({ ...complete, slug: '' })).toBe(0);
    expect(businessOnboardingStep({ ...complete, cities: '' })).toBe(1);
    expect(businessOnboardingStep({ ...complete, hours: '' })).toBe(2);
    expect(businessOnboardingStep({ ...complete, contactValue: '' })).toBe(3);
    expect(businessOnboardingStep({ ...complete, escalationEmail: '' })).toBe(4);
  });

  it('completes only when a human escalation route exists', () => {
    expect(businessOnboardingStep(complete)).toBe(5);
  });
});
