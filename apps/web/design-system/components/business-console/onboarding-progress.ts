export interface BusinessOnboardingFields {
  slug: string;
  cities: string;
  hours: string;
  contactValue: string;
  escalationEmail: string;
}

export function businessOnboardingStep(fields: BusinessOnboardingFields): number {
  if (!fields.slug.trim()) return 0;
  if (!fields.cities.trim()) return 1;
  if (!fields.hours.trim()) return 2;
  if (!fields.contactValue.trim()) return 3;
  if (!fields.escalationEmail.trim()) return 4;
  return 5;
}
