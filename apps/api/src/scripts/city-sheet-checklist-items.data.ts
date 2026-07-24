import { CitySheetCategory } from '@prisma/client';

/**
 * A4-PREP (docs/launch/WORKORDERS.md): default verification checklist
 * items. This is only the initial seed — the checklist itself lives in the
 * database (CitySheetChecklistItem) precisely so Operations can add,
 * reorder, or retire items later via the checklist-items API without an
 * engineering deploy. `category: undefined` means the item is common and
 * applies to every category.
 */
export interface ChecklistItemSeed {
  category?: CitySheetCategory;
  label: string;
  sortOrder: number;
}

export const CITY_SHEET_CHECKLIST_ITEM_SEEDS: ChecklistItemSeed[] = [
  // Common — every category
  { label: "Organization name matches what's on file (or note the correct legal/operating name)", sortOrder: 10 },
  { label: 'Phone number reached and currently in service', sortOrder: 20 },
  { label: 'Organization confirms it is still operating and provides this service', sortOrder: 30 },
  { label: 'Address confirmed accurate (if applicable)', sortOrder: 40 },
  { label: 'Hours confirmed accurate', sortOrder: 50 },
  { label: 'Confirms it serves Chester and/or Delaware County, PA', sortOrder: 60 },
  { label: 'Website (if any) confirmed reachable and accurate', sortOrder: 70 },

  // Category-specific
  { category: CitySheetCategory.CRISIS_LINE, label: 'Confirm 24/7 availability, or the exact hours if not 24/7', sortOrder: 100 },
  { category: CitySheetCategory.CRISIS_LINE, label: 'Confirm what happens if the line is unreachable (backup number or redirect)', sortOrder: 110 },

  { category: CitySheetCategory.FOOD_RESOURCE, label: 'Confirm current distribution days/times (may differ from main office hours)', sortOrder: 100 },
  { category: CitySheetCategory.FOOD_RESOURCE, label: 'Confirm any documentation required to receive food', sortOrder: 110 },

  { category: CitySheetCategory.LEGAL_AID, label: 'Confirm current intake process (phone/online/walk-in)', sortOrder: 100 },
  { category: CitySheetCategory.LEGAL_AID, label: 'Confirm income/eligibility criteria currently in effect', sortOrder: 110 },

  { category: CitySheetCategory.BENEFITS_APPLICATION_SUPPORT, label: 'Confirm which benefit programs are currently supported (e.g. SNAP, TANF, LIHEAP)', sortOrder: 100 },

  { category: CitySheetCategory.ASSISTANCE_PROGRAM, label: 'Confirm the specific services/referrals this line can currently provide', sortOrder: 100 },

  { category: CitySheetCategory.HOUSING_UTILITIES, label: 'Confirm current utility/housing assistance programs offered and any application deadlines', sortOrder: 100 },

  { category: CitySheetCategory.EMPLOYMENT_JOB_SEARCH, label: 'Confirm current job-search services offered (resume help, job listings, training programs)', sortOrder: 100 },

  { category: CitySheetCategory.TRANSPORTATION, label: 'Confirm service area and any cost/eligibility for rides', sortOrder: 100 },

  { category: CitySheetCategory.MAIL_CORRESPONDENCE_SUPPORT, label: 'Confirm what kind of mail/correspondence help is currently offered', sortOrder: 100 },

  { category: CitySheetCategory.HEALTHCARE, label: 'Confirm accepted insurance/payment options and current availability', sortOrder: 100 },
];
