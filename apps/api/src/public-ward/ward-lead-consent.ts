export const WARD_LEAD_CONSENT_VERSION = 'lead-handoff-v2';
export const WARD_LEAD_CONSENT_PURPOSE = 'lead_handoff';
export const WARD_LEAD_CONSENT_DATA_CLASSES = [
  'identity',
  'contact',
  'project',
  'conversation',
  'optional_project_files',
] as const;
export const WARD_LEAD_RETENTION_DAYS = 90;

export function wardLeadConsentText(businessName: string): string {
  return `I agree to share my name, contact details, project information, any optional photo/file references I choose to add, and this Ward conversation with ${businessName} so its team can contact me about this request. This is not consent to unrelated marketing. Aureus will delete this handoff and its retained project intake after ${WARD_LEAD_RETENTION_DAYS} days unless I delete it sooner.`;
}
