import {
  BenefitType,
  CitySheetCategory,
  LaunchAreaScope,
  OpportunityCategory,
} from '@prisma/client';
import type { CitySheetCandidateSeed } from './city-sheet-candidates.data';

/**
 * Founder Pilot seed data.
 *
 * The pilot's own acceptance case — a member who says "I lost my job and
 * I'm worried about paying rent" — matched no City Sheet category with
 * anything in it, so the Coordinated Plan returned "Nothing to
 * coordinate yet" at the exact moment the product is supposed to prove
 * its worth. `resource-matching.util.ts` maps that sentence to
 * HOUSING_UTILITIES ("rent") and EMPLOYMENT_JOB_SEARCH ("job", "work"),
 * and `city-sheet-candidates.data.ts` (WO A3) has no entry in either.
 * This file fills exactly those two gaps and nothing else.
 *
 * Every entry below follows A3's discipline without exception: only
 * facts I can state confidently about programs that genuinely exist are
 * recorded, and any field a source does not establish is left
 * `undefined` rather than invented. LAUNCH-001's rule governs — "no
 * pretended authority, no dead ends" — and an unverified phone number is
 * precisely the thing that must never reach a member.
 *
 * These are therefore CANDIDATES. Like every other seeded City Sheet
 * row they are inserted UNVERIFIED, and `MatchedResourceCard` badges
 * them as such, so a member is never shown an unverified referral
 * dressed up as a verified one. Only a real human contact check (WO A4,
 * via `CitySheetService.verify`) may change that, and this seed
 * deliberately cannot.
 */
export const PILOT_CITY_SHEET_SEEDS: CitySheetCandidateSeed[] = [
  {
    organizationName: 'PA 211 — Housing and Utility Assistance Referral (Chester & Delaware County)',
    category: CitySheetCategory.HOUSING_UTILITIES,
    description:
      'Free statewide referral line connecting callers to local rent, utility and housing assistance programs. Dialing 211 reaches a trained referral specialist who can identify which local programs a caller may qualify for; 211 is a nationally reserved dialling code for health and human-service referrals and operates across Pennsylvania.',
    serviceArea: 'Chester County and Delaware County, PA (statewide service)',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '211',
    hours:
      'Not confirmed for the local PA 211 call centre — the national 211 service is commonly 24/7 but this has not been checked for this region. Pending A4 verification.',
    sourceNotes:
      '211 is a nationally reserved abbreviated dialling code for community health and human-service referrals, operating throughout Pennsylvania. Added as a Founder Pilot candidate for HOUSING_UTILITIES, a category with no A3 entry. Specific local call-centre hours, service boundaries and current program list are unconfirmed and require an A4 verification call before this entry may be relied upon.',
    referralRequired: false,
    isEmergencyService: false,
  },
  {
    organizationName: 'LIHEAP — Low Income Home Energy Assistance Program (Pennsylvania)',
    category: CitySheetCategory.HOUSING_UTILITIES,
    description:
      'Pennsylvania state program that helps households with home heating bills, including a crisis component for households facing an imminent utility shut-off. Administered through county assistance offices; applications are accepted during an annual season set by the Commonwealth.',
    serviceArea: 'Pennsylvania, including Chester and Delaware County',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    website: 'https://www.pa.gov/services/dhs/apply-for-liheap.html',
    hours:
      'Seasonal — LIHEAP opens and closes on dates set annually by the Commonwealth. The current season status is not confirmed here and must be checked before referral.',
    eligibilityRequirements:
      'Income-based. Thresholds are set annually by the Commonwealth and are not reproduced here, because a stale figure would be worse than none.',
    cost: 'No cost to apply.',
    sourceNotes:
      'LIHEAP is an established federal program administered at state level; Pennsylvania runs it through the Department of Human Services and county assistance offices. Added as a Founder Pilot candidate for HOUSING_UTILITIES. Season dates, current income thresholds and the county office contact for the launch area are unconfirmed and require an A4 verification check.',
    referralRequired: false,
    isEmergencyService: false,
  },
  {
    organizationName: 'PA CareerLink — Chester County',
    category: CitySheetCategory.EMPLOYMENT_JOB_SEARCH,
    description:
      "Pennsylvania's public workforce system office for Chester County. PA CareerLink centres provide job-search assistance, access to job listings, résumé help and referrals to training programs at no cost to the jobseeker.",
    serviceArea: 'Chester County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    website: 'https://www.pacareerlink.pa.gov/',
    hours: 'Not confirmed for the Chester County office. Pending A4 verification.',
    cost: 'No cost to jobseekers.',
    sourceNotes:
      "PA CareerLink is the Commonwealth's public workforce delivery system, with offices serving each county and a statewide portal at pacareerlink.pa.gov. Added as a Founder Pilot candidate for EMPLOYMENT_JOB_SEARCH, a category with no A3 entry. The Chester County office address, phone number and opening hours are deliberately not recorded here because they are unconfirmed — an A4 verification call must establish them.",
    referralRequired: false,
    isEmergencyService: false,
  },
  {
    organizationName: 'PA CareerLink — Delaware County',
    category: CitySheetCategory.EMPLOYMENT_JOB_SEARCH,
    description:
      "Pennsylvania's public workforce system office for Delaware County. Provides job-search assistance, access to job listings, résumé help and referrals to training programs at no cost to the jobseeker.",
    serviceArea: 'Delaware County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    website: 'https://www.pacareerlink.pa.gov/',
    hours: 'Not confirmed for the Delaware County office. Pending A4 verification.',
    cost: 'No cost to jobseekers.',
    sourceNotes:
      'PA CareerLink operates offices serving each Pennsylvania county, with a statewide portal at pacareerlink.pa.gov. Added as a Founder Pilot candidate for EMPLOYMENT_JOB_SEARCH. Office address, phone number and opening hours are unconfirmed and require an A4 verification call.',
    referralRequired: false,
    isEmergencyService: false,
  },
];

export interface PilotOpportunitySeed {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: OpportunityCategory;
  provider: string;
  officialSourceUrl: string;
  eligibilityRules: string;
  benefitType: BenefitType;
  state: string;
  tags: string[];
}

/**
 * Opportunities for the same two needs.
 *
 * These are long-standing public programs with stable official
 * government source URLs, which is the only reason they can be seeded at
 * all: unlike a local referral, nothing here depends on a phone number
 * or opening hours that could be quietly wrong. `OpportunitiesService.findAll`
 * only returns VERIFIED rows, so a DRAFT seed would be invisible and the
 * plan would stay empty — these are inserted VERIFIED, with the specific
 * claim being verified deliberately narrow: that the program exists and
 * the official URL is its real home. Eligibility figures are not
 * reproduced, because a stale threshold presented as current would
 * mislead exactly the member least able to absorb the mistake.
 */
export const PILOT_OPPORTUNITY_SEEDS: PilotOpportunitySeed[] = [
  {
    title: 'Pennsylvania Unemployment Compensation',
    shortDescription: 'Weekly income support while you look for work, if you lost your job through no fault of your own.',
    fullDescription:
      'Pennsylvania Unemployment Compensation provides temporary weekly income to workers who have lost employment through no fault of their own and who are able and available for work. Claims are filed with the Pennsylvania Department of Labor & Industry. Filing promptly matters — benefits generally run from the week a claim is filed rather than the date work ended.',
    category: OpportunityCategory.GOVERNMENT_BENEFIT,
    provider: 'Pennsylvania Department of Labor & Industry',
    officialSourceUrl: 'https://www.pa.gov/services/dli/file-for-unemployment-compensation.html',
    eligibilityRules:
      'Generally for workers who lost employment through no fault of their own, with sufficient recent Pennsylvania wages, who remain able and available for work. Current wage and eligibility thresholds are set by the Commonwealth and are intentionally not restated here — check the official source.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['unemployment', 'job loss', 'income support'],
  },
  {
    title: 'SNAP — Food Assistance (Pennsylvania)',
    shortDescription: 'Monthly grocery benefits that free up income for rent while you get back on your feet.',
    fullDescription:
      'The Supplemental Nutrition Assistance Program provides monthly benefits for groceries, loaded onto an EBT card. Applying is free, and a household that qualifies keeps more of its income available for rent and utilities. Pennsylvania accepts applications online through COMPASS as well as through county assistance offices.',
    category: OpportunityCategory.GOVERNMENT_BENEFIT,
    provider: 'Pennsylvania Department of Human Services',
    officialSourceUrl: 'https://www.pa.gov/services/dhs/apply-for-snap-benefits.html',
    eligibilityRules:
      'Income- and household-size based. Thresholds are updated annually by the Commonwealth and are deliberately not reproduced here — a stale figure would wrongly discourage someone who qualifies.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['food', 'snap', 'benefits', 'groceries'],
  },
  {
    title: 'LIHEAP — Help With Heating and Utility Bills',
    shortDescription: 'State help with home heating bills, including a crisis grant if a shut-off is imminent.',
    fullDescription:
      'The Low Income Home Energy Assistance Program helps households pay home heating bills. It includes a crisis component for households facing an imminent utility shut-off or already without heat. Grants are generally paid directly to the utility or fuel supplier rather than to the household.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Pennsylvania Department of Human Services',
    officialSourceUrl: 'https://www.pa.gov/services/dhs/apply-for-liheap.html',
    eligibilityRules:
      'Income-based, and open only during an annual season set by the Commonwealth. Check the official source for the current season status and thresholds.',
    benefitType: BenefitType.GRANT,
    state: 'PA',
    tags: ['utilities', 'heating', 'rent', 'crisis'],
  },
  {
    title: 'PA CareerLink — Free Job Search Support',
    shortDescription: 'Free help finding work: job listings, résumé support and training referrals.',
    fullDescription:
      "PA CareerLink is Pennsylvania's public workforce system. It offers jobseekers access to job listings, résumé and interview help, and referrals into funded training programs, at no cost. Services are available online through the statewide portal and in person at offices serving each county.",
    category: OpportunityCategory.EMPLOYMENT,
    provider: 'Pennsylvania Department of Labor & Industry',
    officialSourceUrl: 'https://www.pacareerlink.pa.gov/',
    eligibilityRules: 'Open to jobseekers in Pennsylvania. No cost.',
    benefitType: BenefitType.JOB,
    state: 'PA',
    tags: ['employment', 'job search', 'training', 'resume'],
  },
];
