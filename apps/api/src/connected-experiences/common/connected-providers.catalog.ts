import { ConnectedProviderType } from '@prisma/client';

export type ConnectedProviderCategory = 'EMAIL' | 'CALENDAR' | 'FINANCIAL' | 'GOVERNMENT';

export type ConnectedProviderAvailability = 'AVAILABLE' | 'COMING_SOON';

/**
 * Fixed, code-defined catalog (DOMAIN-008 Founder Decision 4) — every
 * connectable service answers the four required questions before a member
 * ever sees a "Connect" button: what Aureus can access, why it's needed,
 * what the AI Steward can do with it, and whether it's actually available
 * yet. `availability` is derived at read time from whether a real adapter
 * is configured for that provider (see accounts/providers/) — never
 * hardcoded to AVAILABLE, so this catalog can never claim readiness the
 * backend doesn't have (Founder Decision 1: "never simulate a successful
 * third-party connection").
 */
export interface ConnectedProviderCatalogEntry {
  providerType: ConnectedProviderType;
  displayName: string;
  category: ConnectedProviderCategory;
  whatAureusCanAccess: string;
  whyItsNeeded: string;
  whatTheAiStewardCanDo: string;
}

export const CONNECTED_PROVIDER_CATALOG: Record<ConnectedProviderType, ConnectedProviderCatalogEntry> = {
  GMAIL: {
    providerType: 'GMAIL',
    displayName: 'Gmail',
    category: 'EMAIL',
    whatAureusCanAccess: 'Read access to messages you choose to share, such as ones related to jobs, benefits, housing, or education.',
    whyItsNeeded: 'So your AI Steward can notice things that matter to your goals — like an interview confirmation or a document a landlord sent — without you having to forward every email by hand.',
    whatTheAiStewardCanDo: 'Point out relevant messages and offer to help you understand or respond to them. It will never send an email on your behalf.',
  },
  GOOGLE_CALENDAR: {
    providerType: 'GOOGLE_CALENDAR',
    displayName: 'Google Calendar',
    category: 'CALENDAR',
    whatAureusCanAccess: 'Read access to your upcoming events.',
    whyItsNeeded: 'So your AI Steward can remind you about things like an interview or appointment and offer to help you prepare.',
    whatTheAiStewardCanDo: 'Reference upcoming events in conversation and offer preparation help. It will never create, edit, or delete an event.',
  },
  OUTLOOK_MAIL: {
    providerType: 'OUTLOOK_MAIL',
    displayName: 'Outlook Mail',
    category: 'EMAIL',
    whatAureusCanAccess: 'Read access to messages you choose to share, such as ones related to jobs, benefits, housing, or education.',
    whyItsNeeded: 'So your AI Steward can notice things that matter to your goals without you having to forward every email by hand.',
    whatTheAiStewardCanDo: 'Point out relevant messages and offer to help you understand or respond to them. It will never send an email on your behalf.',
  },
  OUTLOOK_CALENDAR: {
    providerType: 'OUTLOOK_CALENDAR',
    displayName: 'Outlook Calendar',
    category: 'CALENDAR',
    whatAureusCanAccess: 'Read access to your upcoming events.',
    whyItsNeeded: 'So your AI Steward can remind you about things like an interview or appointment and offer to help you prepare.',
    whatTheAiStewardCanDo: 'Reference upcoming events in conversation and offer preparation help. It will never create, edit, or delete an event.',
  },
  BANKING: {
    providerType: 'BANKING',
    displayName: 'Banking',
    category: 'FINANCIAL',
    whatAureusCanAccess: 'Read-only account and transaction visibility for accounts you choose to connect.',
    whyItsNeeded: 'So your AI Steward can help you understand your financial picture as part of your broader goals.',
    whatTheAiStewardCanDo: 'Explain what it sees and answer questions about it. It will never move money or authorize a transaction.',
  },
  PAYROLL: {
    providerType: 'PAYROLL',
    displayName: 'Payroll',
    category: 'FINANCIAL',
    whatAureusCanAccess: 'Read-only visibility into pay statements you choose to connect.',
    whyItsNeeded: 'So your AI Steward can help you track income as part of your financial goals.',
    whatTheAiStewardCanDo: 'Explain what it sees and answer questions about it. It will never change your pay or withholding settings.',
  },
  INVESTMENT_ACCOUNTS: {
    providerType: 'INVESTMENT_ACCOUNTS',
    displayName: 'Investment Accounts',
    category: 'FINANCIAL',
    whatAureusCanAccess: 'Read-only visibility into investment balances and holdings you choose to connect.',
    whyItsNeeded: 'So your AI Steward can help you understand progress toward long-term financial goals.',
    whatTheAiStewardCanDo: 'Explain what it sees and answer questions about it. It will never place a trade or move funds.',
  },
  GOVERNMENT_BENEFITS: {
    providerType: 'GOVERNMENT_BENEFITS',
    displayName: 'Government Benefits',
    category: 'GOVERNMENT',
    whatAureusCanAccess: 'Read-only visibility into benefit status and correspondence you choose to connect.',
    whyItsNeeded: 'So your AI Steward can help you keep track of deadlines and next steps for benefits you rely on.',
    whatTheAiStewardCanDo: 'Explain what it sees and help you understand next steps. It will never submit an application or respond on your behalf.',
  },
  TAX_RECORDS: {
    providerType: 'TAX_RECORDS',
    displayName: 'Tax Records',
    category: 'GOVERNMENT',
    whatAureusCanAccess: 'Read-only visibility into tax documents and filing status you choose to connect.',
    whyItsNeeded: 'So your AI Steward can help you stay organized around tax deadlines and documentation.',
    whatTheAiStewardCanDo: 'Explain what it sees and help you understand deadlines. It will never file or amend anything on your behalf.',
  },
};

export function getConnectedProviderCatalogEntry(providerType: ConnectedProviderType): ConnectedProviderCatalogEntry {
  return CONNECTED_PROVIDER_CATALOG[providerType];
}

export function listConnectedProviderCatalog(): ConnectedProviderCatalogEntry[] {
  return Object.values(CONNECTED_PROVIDER_CATALOG);
}
