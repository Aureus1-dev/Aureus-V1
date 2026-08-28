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
  applicationUrl?: string;
  eligibilityRules: string;
  benefitType: BenefitType;
  benefitAmount?: string;
  state?: string;
  location?: string;
  country?: string;
  tags: string[];
  deadline?: string;
  datePublished?: string;
  verifiedAt: string;
}

/**
 * Founder Pilot launch opportunities.
 *
 * Launch policy:
 * - member value outranks Aureus revenue;
 * - an official HTTPS destination is sufficient — no affiliate relationship is required;
 * - time-sensitive facts carry an explicit researched-at timestamp instead of being
 *   re-stamped "fresh" every time a database seed happens to run;
 * - dollar amounts are stated only when the official source establishes them;
 * - bank incentives are never represented as emergency or same-day cash.
 *
 * This launch set intentionally favors a smaller number of high-impact, directly
 * actionable public/official opportunities over a long list of low-value offer walls.
 */
export const PILOT_OPPORTUNITY_SEEDS: PilotOpportunitySeed[] = [
  {
    title: 'Pennsylvania Unemployment Compensation',
    shortDescription: 'Weekly income support while you look for work, if you lost your job through no fault of your own.',
    fullDescription:
      'Pennsylvania Unemployment Compensation provides temporary weekly income to eligible workers who have lost employment through no fault of their own and remain able and available for work. File promptly through the official Pennsylvania Department of Labor & Industry service; the Commonwealth determines eligibility and benefit amount.',
    category: OpportunityCategory.GOVERNMENT_BENEFIT,
    provider: 'Pennsylvania Department of Labor & Industry',
    officialSourceUrl: 'https://www.pa.gov/services/dli/apply-for-unemployment-compensation-benefits',
    eligibilityRules:
      'Generally requires sufficient recent covered wages, qualifying job separation, and remaining able and available for suitable work. Use the official source for current eligibility rules.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['unemployment', 'job loss', 'income support', 'cash flow'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'SNAP — Food Assistance (Pennsylvania)',
    shortDescription: 'Monthly grocery benefits that can free up household cash for rent, utilities, and other essentials.',
    fullDescription:
      'Pennsylvania SNAP provides monthly grocery benefits on an EBT card for eligible households. Applying is free. This is not cash paid to the member, but reducing grocery costs can immediately protect money needed for housing, transportation, and utilities.',
    category: OpportunityCategory.GOVERNMENT_BENEFIT,
    provider: 'Pennsylvania Department of Human Services',
    officialSourceUrl: 'https://www.pa.gov/services/dhs/apply-for-the-supplemental-nutrition-assistance-program-snap',
    eligibilityRules:
      'Income and household rules apply and change over time. Use the official Pennsylvania source for the current limits and application options.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['food', 'snap', 'benefits', 'groceries', 'ebt'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Pennsylvania Cash Assistance',
    shortDescription: 'Apply for state cash-assistance programs through COMPASS if your household has very limited income.',
    fullDescription:
      'Pennsylvania Department of Human Services accepts applications for cash-assistance programs including TANF and other qualifying programs through COMPASS. The program and amount depend on the household; Aureus should never promise eligibility or a specific payment before the Commonwealth decides.',
    category: OpportunityCategory.GOVERNMENT_BENEFIT,
    provider: 'Pennsylvania Department of Human Services',
    officialSourceUrl: 'https://www.pa.gov/services/dhs/apply-for-cash-assistance',
    eligibilityRules:
      'Program-specific income, household, residency, and other rules apply. The official Pennsylvania application determines which cash-assistance path is available.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['cash assistance', 'tanf', 'compass', 'income', 'emergency money'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Pennsylvania Unclaimed Property — Search for Money Owed to You',
    shortDescription: 'Search Pennsylvania Treasury for unclaimed money or property in your name; the average PA claim is over $1,000.',
    fullDescription:
      'Pennsylvania Treasury reports that 1 in 10 Pennsylvanians has unclaimed property and that the average claim is over $1,000. Searching is free and the amount varies by person. Use Treasury’s official search and claim process; Aureus should guide the member but never invent a match or dollar amount.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Pennsylvania Treasury',
    officialSourceUrl: 'https://www.patreasury.gov/unclaimed-property/',
    benefitType: BenefitType.BENEFIT,
    benefitAmount: 'Average Pennsylvania claim is over $1,000; individual claims vary.',
    eligibilityRules:
      'A person or organization must have property reported in their name and may need identity/ownership documentation to claim it.',
    state: 'PA',
    tags: ['unclaimed property', 'money owed', 'treasury', 'refund', 'cash'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Water Customer Assistance — TAP and Shutoff Protection',
    shortDescription: 'Apply for lower water bills, debt relief, and shutoff protection through Philadelphia’s assistance application.',
    fullDescription:
      'Philadelphia’s water customer assistance application can screen eligible households for the Tiered Assistance Program and related help. Applying can delay shutoff while the application is processed, and eligible TAP customers may receive lower bills and debt forgiveness over time after successful payments. This is a direct hardship path, not a generic resource list.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'City of Philadelphia',
    officialSourceUrl: 'https://cap.phila.gov/',
    applicationUrl: 'https://cap.phila.gov/',
    eligibilityRules:
      'Philadelphia Water Department customer-assistance rules apply. Income and special-hardship circumstances can affect eligibility; use the official application for the current determination.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    location: 'Philadelphia',
    tags: ['water bill', 'utility', 'shutoff', 'tap', 'debt forgiveness', 'hardship'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Pennsylvania Property Tax/Rent Rebate',
    shortDescription: 'Eligible older adults and adults with disabilities can claim a state rebate worth up to $1,000, with some Philadelphia homeowners eligible for up to $1,500.',
    fullDescription:
      'Pennsylvania’s Property Tax/Rent Rebate Program is open for 2025 claims through December 31, 2026. Standard rebates range from $380 to $1,000 based on eligibility; supplemental rebates can bring the total to $1,500 for certain qualifying homeowners, including some in Philadelphia. Filing is free.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Pennsylvania Department of Revenue',
    officialSourceUrl: 'https://www.pa.gov/services/revenue/apply-for-property-tax-or-rent-rebate',
    eligibilityRules:
      'Generally for Pennsylvanians age 65+, widows/widowers age 50+, and adults age 18+ with a qualifying disability, subject to the current household-income limit and program rules.',
    benefitType: BenefitType.GRANT,
    benefitAmount: '$380–$1,000 standard rebate; up to $1,500 for some qualifying homeowners.',
    state: 'PA',
    tags: ['rent rebate', 'property tax', 'senior', 'disability', 'rebate', 'cash'],
    deadline: '2026-12-31T23:59:59.000Z',
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'IRS Free File — File 2025 Taxes and Claim Refundable Credits',
    shortDescription: 'Use IRS Free File through October 15 if eligible and claim tax refunds or credits you may have missed.',
    fullDescription:
      'IRS Free File guided tax software remains available through October 15, 2026 for eligible taxpayers. A completed return may unlock a federal refund and refundable credits such as the Earned Income Tax Credit or Child Tax Credit when the taxpayer qualifies. Aureus must not promise a refund amount; the tax return and IRS rules determine it.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Internal Revenue Service',
    officialSourceUrl: 'https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free',
    eligibilityRules:
      'Guided IRS Free File software is available for taxpayers within the current adjusted-gross-income limit shown by the IRS; individual credit eligibility has separate rules.',
    benefitType: BenefitType.BENEFIT,
    benefitAmount: 'Potential refund/credits vary; 2025 EITC can reach $8,046 depending on eligibility.',
    country: 'US',
    tags: ['tax refund', 'eitc', 'child tax credit', 'irs free file', 'money owed'],
    deadline: '2026-10-15T23:59:59.000Z',
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Working Pennsylvanians Tax Credit',
    shortDescription: 'Pennsylvanians who qualify for the federal EITC may qualify for a new refundable state credit worth up to $805.',
    fullDescription:
      'Pennsylvania’s Working Pennsylvanians Tax Credit is a refundable state tax credit equal to 10% of the federal Earned Income Tax Credit for qualifying filers. Pennsylvania reports the credit can be worth up to $805. Members should use official tax-filing guidance rather than assuming eligibility from income alone.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Pennsylvania Department of Revenue',
    officialSourceUrl: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/personal-income-tax/working-pennsylvanians-tax-credit',
    eligibilityRules:
      'A taxpayer must qualify for the federal Earned Income Tax Credit and file the required Pennsylvania return/documentation under current Department of Revenue rules.',
    benefitType: BenefitType.BENEFIT,
    benefitAmount: 'Up to $805.',
    state: 'PA',
    tags: ['tax credit', 'eitc', 'working pennsylvanians', 'refund', 'cash'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Rent and Homelessness Prevention Assistance',
    shortDescription: 'Get screened for current Philadelphia help with overdue rent, security deposits, or housing instability.',
    fullDescription:
      'Philadelphia’s Office of Homeless Services directs residents who need help paying rent or securing housing to homelessness-prevention financial assistance and intake. Because funding and eligibility change, Aureus should route members through the current official City process instead of relying on an old grant name or stale funding round.',
    category: OpportunityCategory.HOUSING,
    provider: 'City of Philadelphia — Office of Homeless Services',
    officialSourceUrl: 'https://www.phila.gov/departments/office-of-homeless-services/get-help/',
    eligibilityRules:
      'Philadelphia residency, housing crisis, income, funding availability, and program-specific rules can apply. The City intake process determines current assistance.',
    benefitType: BenefitType.HOUSING,
    state: 'PA',
    location: 'Philadelphia',
    tags: ['rent', 'housing', 'security deposit', 'homelessness prevention', 'eviction'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Eviction Diversion and Targeted Financial Assistance',
    shortDescription: 'Eligible landlords and tenants can use City eviction-diversion services, including mediation and possible targeted rent-arrears assistance.',
    fullDescription:
      'Philadelphia’s Eviction Diversion Program is designed to resolve qualifying landlord-tenant disputes before eviction. Depending on the current case and funding rules, Targeted Financial Assistance may be available alongside diversion. Aureus should never promise an award; the City program determines whether financial assistance is available and appropriate.',
    category: OpportunityCategory.HOUSING,
    provider: 'City of Philadelphia',
    officialSourceUrl: 'https://eviction-diversion.phila.gov/',
    applicationUrl: 'https://eviction-diversion.phila.gov/',
    eligibilityRules:
      'Philadelphia program rules apply, including landlord/tenant participation, income or hardship requirements where applicable, and current funding/program availability.',
    benefitType: BenefitType.HOUSING,
    state: 'PA',
    location: 'Philadelphia',
    tags: ['eviction', 'rent arrears', 'landlord', 'tenant', 'mediation', 'housing'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Basic Systems Repair Program',
    shortDescription: 'Eligible Philadelphia homeowners can receive free emergency repairs for critical home systems.',
    fullDescription:
      'Philadelphia’s Basic Systems Repair Program provides free emergency repairs for qualifying owner-occupied homes, including critical electrical, plumbing, heating, structural, and roofing problems. This is not a cash payment, but the avoided repair cost can be substantial for a household in hardship.',
    category: OpportunityCategory.HOUSING,
    provider: 'City of Philadelphia',
    officialSourceUrl: 'https://www.phila.gov/services/property-lots-housing/get-home-improvement-help/get-emergency-home-repairs/',
    eligibilityRules:
      'Owner-occupancy, Philadelphia location, income, property condition, and program-capacity rules apply. Use the official City intake for current eligibility.',
    benefitType: BenefitType.HOUSING,
    state: 'PA',
    location: 'Philadelphia',
    tags: ['home repair', 'roof', 'plumbing', 'heating', 'electrical', 'homeowner'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Home Repair Academy — Paid Trades Training',
    shortDescription: 'Apply now for a six-month paid construction-trades program: $15/hour training, then a $18/hour internship based on performance.',
    fullDescription:
      'Philadelphia’s Home Repair Academy is accepting applications for a cohort scheduled to run September 28, 2026 through March 26, 2027. The first three months are paid classroom and hands-on training at $15/hour; the next three months are a paid internship at $18/hour based on performance. Participants can earn OSHA 30 and NCCER Core credentials while training across home-repair trades.',
    category: OpportunityCategory.EMPLOYMENT,
    provider: 'City of Philadelphia / PowerCorpsPHL',
    officialSourceUrl: 'https://www.phila.gov/2026-08-03-new-home-repair-academy-creates-paid-pathway-to-skilled-trades-careers-while-supporting-mayor-parkers-h-o-m-e-initiative/',
    eligibilityRules:
      'Applicants must be at least 18 and have a high-school diploma or equivalent. The City states no prior trades experience is required; the application process determines final admission.',
    benefitType: BenefitType.TRAINING,
    benefitAmount: '$15/hour during training; $18/hour internship based on performance.',
    state: 'PA',
    location: 'Philadelphia',
    tags: ['paid training', 'construction', 'hvac', 'electrical', 'plumbing', 'roofing', 'career'],
    datePublished: '2026-08-03T00:00:00.000Z',
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'City of Philadelphia Jobs',
    shortDescription: 'Browse current City jobs, including entry-level roles that accept a high-school diploma or GED.',
    fullDescription:
      'The City of Philadelphia maintains a live job board with civil-service and other openings. Current postings include entry-level roles with high-school/GED requirements as well as skilled and professional positions. Because individual jobs open and close frequently, Aureus links to the live official job board instead of preserving stale individual postings.',
    category: OpportunityCategory.EMPLOYMENT,
    provider: 'City of Philadelphia',
    officialSourceUrl: 'https://www.phila.gov/jobs/',
    eligibilityRules:
      'Each City posting has its own education, experience, residency, licensing, and application-deadline requirements.',
    benefitType: BenefitType.JOB,
    state: 'PA',
    location: 'Philadelphia',
    tags: ['jobs', 'city jobs', 'entry level', 'ged', 'employment', 'career'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'PA CareerLink — Free Job Search Support',
    shortDescription: 'Free help finding work: live job listings, résumé support, interview help, and training referrals.',
    fullDescription:
      'PA CareerLink is Pennsylvania’s public workforce system. Jobseekers can use the statewide portal and local offices for job-search support, résumé and interview help, and referrals to training programs at no cost.',
    category: OpportunityCategory.EMPLOYMENT,
    provider: 'Pennsylvania Department of Labor & Industry',
    officialSourceUrl: 'https://www.pacareerlink.pa.gov/',
    eligibilityRules: 'Open to jobseekers in Pennsylvania. Individual training programs can have additional eligibility rules.',
    benefitType: BenefitType.JOB,
    state: 'PA',
    tags: ['employment', 'job search', 'training', 'resume', 'careerlink'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Bridges to City Employment — Free Career Training',
    shortDescription: 'Free training pathways for City careers such as IT support, clerical work, auto mechanic helper, medical clerk, and corrections.',
    fullDescription:
      'Philadelphia’s City College for Municipal Employment and Bridges to City Employment connect residents with free skills and technical training for identified City career pathways. The available program mix changes, so Aureus should route members to the current enrollment page rather than claim a seat in a specific cohort.',
    category: OpportunityCategory.EDUCATION,
    provider: 'City of Philadelphia',
    officialSourceUrl: 'https://www.phila.gov/programs/city-college-for-municipal-employment-ccme/',
    eligibilityRules:
      'Program-specific eligibility and enrollment rules apply. Use the official City page to see which training cohorts are currently open.',
    benefitType: BenefitType.TRAINING,
    state: 'PA',
    location: 'Philadelphia',
    tags: ['free training', 'city employment', 'it support', 'clerical', 'career pathway'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Chase Secure Banking — $175 New Account Bonus',
    shortDescription: 'A more accessible checking bonus: $175 after opening a new eligible account and completing 10 qualifying transactions.',
    fullDescription:
      'Chase currently advertises a $175 Secure Banking bonus for eligible new customers who open an account and complete 10 qualifying transactions within 60 days. Chase says the bonus is deposited within 15 days after the requirements are met. This is not emergency or same-day cash. Review the monthly-fee rules and account terms before opening.',
    category: OpportunityCategory.BANKING_INCENTIVE,
    provider: 'Chase',
    officialSourceUrl: 'https://account.chase.com/consumer/banking/secure',
    applicationUrl: 'https://account.chase.com/consumer/banking/secure',
    eligibilityRules:
      'New-customer and account-eligibility rules apply. Complete 10 qualifying transactions within 60 days under the current offer terms; review monthly-fee waiver requirements before opening.',
    benefitType: BenefitType.OTHER,
    benefitAmount: '$175',
    country: 'US',
    tags: ['bank bonus', 'checking', '175', 'new account', 'not same day'],
    deadline: '2026-10-14T23:59:59.000Z',
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Chase Total Checking — $400 New Account Bonus',
    shortDescription: 'Earn a $400 checking bonus if you can route at least $1,000 in qualifying direct deposits within 90 days.',
    fullDescription:
      'Chase currently advertises a $400 Total Checking bonus for eligible new customers who receive qualifying electronic direct deposits totaling $1,000 or more within 90 days. Chase says the bonus is deposited within 15 days after requirements are met. This is not emergency cash; review the account’s monthly-fee and waiver terms first.',
    category: OpportunityCategory.BANKING_INCENTIVE,
    provider: 'Chase',
    officialSourceUrl: 'https://account.chase.com/consumer/banking/seo',
    applicationUrl: 'https://account.chase.com/consumer/banking/seo',
    eligibilityRules:
      'New-customer and account-eligibility rules apply. The current offer requires at least $1,000 in qualifying direct deposits within 90 days; review monthly-fee waiver requirements.',
    benefitType: BenefitType.OTHER,
    benefitAmount: '$400',
    country: 'US',
    tags: ['bank bonus', 'checking', 'direct deposit', '400', 'not same day'],
    deadline: '2026-10-14T23:59:59.000Z',
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'TD Complete Checking — $200 New Account Bonus',
    shortDescription: 'Earn $200 if you can receive $500 in qualifying direct deposits within 60 days under TD’s current offer.',
    fullDescription:
      'TD currently advertises a $200 Complete Checking bonus for eligible new customers who receive $500 in qualifying direct deposits within 60 days. TD states the bonus is paid on or before 180 days after account opening. This is not quick or guaranteed cash; review the monthly fee, waiver rules, and full offer terms before opening.',
    category: OpportunityCategory.BANKING_INCENTIVE,
    provider: 'TD Bank',
    officialSourceUrl: 'https://www.td.com/us/en/personal-banking/checking-and-saving-bonus',
    applicationUrl: 'https://www.td.com/us/en/personal-banking/checking-and-saving-bonus',
    eligibilityRules:
      'New-customer and account-eligibility rules apply. The current offer requires $500 in qualifying direct deposits within 60 days and is subject to TD’s full promotion terms.',
    benefitType: BenefitType.OTHER,
    benefitAmount: '$200',
    country: 'US',
    tags: ['bank bonus', 'checking', 'direct deposit', '200', 'not same day'],
    deadline: '2026-09-30T23:59:59.000Z',
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Pennsylvania Child Care Works — Subsidized Child Care',
    shortDescription: 'Eligible working or training families can get state help paying part or all of qualifying child care costs.',
    fullDescription:
      'Pennsylvania Child Care Works helps eligible low-income families pay for reliable child care while a parent or caretaker works or participates in education or training. The local Early Learning Resource Center may pay all or part of qualifying child care costs; a family copayment or provider difference may still apply.',
    category: OpportunityCategory.GOVERNMENT_BENEFIT,
    provider: 'Pennsylvania Department of Human Services',
    officialSourceUrl: 'https://www.pa.gov/services/dhs/apply-for-child-care-works-subsidized-child-care',
    eligibilityRules:
      'Pennsylvania residency, child age, income, work/training, and other program rules apply. The current program generally requires qualifying work/training activity and income within the published limits; the ELRC makes the determination.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['child care', 'daycare', 'subsidy', 'working parent', 'training', 'family'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Philadelphia Gas Works CRP — Lower Gas Bill and Debt Forgiveness',
    shortDescription: 'Eligible low-income PGW customers can lower monthly gas bills by up to 50% and reduce past-due debt.',
    fullDescription:
      'Philadelphia Gas Works says its Customer Responsibility Program can lower an eligible customer’s gas bill by up to 50% and forgive past debt while helping keep service on. The discount depends on household size, gross income, and average gas bill. This is current year-round PGW assistance and is separate from the currently closed LIHEAP season.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Philadelphia Gas Works',
    officialSourceUrl: 'https://www.pgworks.com/customer-care/crp',
    applicationUrl: 'https://www.pgworks.com/customer-care/crp',
    eligibilityRules:
      'PGW customer, household-income, documentation, and program rules apply. Re-enrollment can require curing past CRP bills; use PGW’s current application for the actual determination.',
    benefitType: BenefitType.BENEFIT,
    benefitAmount: 'Up to 50% lower gas bill; eligible past debt can be forgiven.',
    state: 'PA',
    location: 'Philadelphia',
    tags: ['gas bill', 'pgw', 'utility', 'shutoff', 'debt forgiveness', 'crp'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'PECO Assistance Finder — Match to Current Bill Help',
    shortDescription: 'Use PECO’s official three-minute assistance finder to identify current bill-assistance programs you are likely to qualify for.',
    fullDescription:
      'PECO’s official Assistance Finder asks a short set of household questions and recommends current assistance that may fit. Eligibility is not final until the member completes the relevant application. This route is more reliable than Aureus hard-coding a seasonal grant or stale program rule.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'PECO',
    officialSourceUrl: 'https://secure.peco.com/assistance/finder',
    applicationUrl: 'https://secure.peco.com/assistance/finder',
    eligibilityRules:
      'Program-specific PECO assistance rules apply; the finder provides likely matches and the underlying program application confirms eligibility.',
    benefitType: BenefitType.BENEFIT,
    state: 'PA',
    tags: ['electric bill', 'peco', 'utility', 'assistance', 'shutoff', 'energy'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
  {
    title: 'Lifeline — Discounted Phone or Internet Service',
    shortDescription: 'Eligible low-income households can receive a monthly Lifeline discount on phone or internet service.',
    fullDescription:
      'The federal Lifeline program provides qualifying households a monthly communications discount. USAC currently lists up to $9.25 per month for internet or bundled service, up to $5.25 for voice-only service, and an enhanced benefit on qualifying Tribal lands. Apply through the official Lifeline National Verifier, then choose a participating provider.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    provider: 'Universal Service Administrative Company / FCC',
    officialSourceUrl: 'https://www.lifelinesupport.org/how-to-apply/',
    applicationUrl: 'https://www.lifelinesupport.org/how-to-apply/',
    eligibilityRules:
      'Household income or participation in a qualifying assistance program such as SNAP, Medicaid, SSI, Federal Public Housing Assistance, or Veterans and Survivors Pension can qualify; one Lifeline benefit is generally allowed per household.',
    benefitType: BenefitType.BENEFIT,
    benefitAmount: 'Up to $9.25/month internet or bundled service; up to $5.25/month voice-only; enhanced Tribal benefit available.',
    country: 'US',
    tags: ['phone', 'internet', 'lifeline', 'monthly bill', 'snap', 'medicaid'],
    verifiedAt: '2026-08-28T12:28:00.000Z',
  },
];
