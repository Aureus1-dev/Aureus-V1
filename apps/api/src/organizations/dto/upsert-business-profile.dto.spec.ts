import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertBusinessProfileDto } from './upsert-business-profile.dto';

const valid = {
  publicSlug: 'river-city-kitchens',
  serviceArea: { cities: ['Dayton'], remote: false },
  businessHours: { summary: 'Weekdays' },
  contactRoutes: [{ type: 'PHONE', value: '+1 555 0100' }],
  escalationTarget: { email: 'human@example.com' },
  onboardingStep: 5,
};

describe('UpsertBusinessProfileDto deny paths', () => {
  it.each([
    ['invalid public slug', { ...valid, publicSlug: '../other-tenant' }],
    ['out-of-range onboarding step', { ...valid, onboardingStep: 6 }],
    ['unsupported contact route', {
      ...valid,
      contactRoutes: [{ type: 'INTERNAL_TOOL', value: 'override' }],
    }],
    ['invalid escalation email', {
      ...valid,
      escalationTarget: { email: 'not-an-email' },
    }],
  ])('rejects %s', async (_label, input) => {
    const dto = plainToInstance(UpsertBusinessProfileDto, input);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('accepts a bounded business profile', async () => {
    const dto = plainToInstance(UpsertBusinessProfileDto, valid);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
