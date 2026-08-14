export const WARD_LEAD_CONSENT_VERSION = 'lead-handoff-v1';
export const WARD_LEAD_CONSENT_PURPOSE = 'lead_handoff';
export const WARD_LEAD_CONSENT_DATA_CLASSES = [
  'identity',
  'contact',
  'project',
  'conversation',
] as const;
export const WARD_LEAD_RETENTION_DAYS = 90;

export function wardLeadConsentText(businessName: string): string {
  return `I agree to share my name, contact details, project summary, and this Ward conversation with ${businessName} so its team can contact me about this request. This is not consent to unrelated marketing. Aureus will delete this handoff after ${WARD_LEAD_RETENTION_DAYS} days unless I delete it sooner.`;
}
