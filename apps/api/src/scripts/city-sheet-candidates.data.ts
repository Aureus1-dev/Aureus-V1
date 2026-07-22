import { CitySheetCategory, LaunchAreaScope } from '@prisma/client';

/**
 * WO A3 (docs/launch/WORKORDERS.md): the initial candidate referral list for
 * the launch metro (Chester and Delaware County, PA — Founder Decision P1).
 *
 * Every fact below traces to a specific web source, cited in that entry's
 * `verificationNotes`. Nothing here is fabricated: where a source did not
 * state a fact (hours, eligibility, a website, an address), the field is
 * left `undefined` rather than guessed, or `verificationNotes` says plainly
 * that it is unconfirmed. These are candidates only — every entry is
 * inserted with verificationStatus UNVERIFIED and must pass a real human
 * phone/contact check (A4) before it may be relied on by the Clearing
 * (Gate B) or curated Search (Gate C). LAUNCH-001's own rule governs: "no
 * pretended authority, no dead ends" — an unverified phone number is exactly
 * the kind of thing that must never reach a member.
 */

export interface CitySheetCandidateSeed {
  organizationName: string;
  category: CitySheetCategory;
  description: string;
  address?: string;
  serviceArea: string;
  launchScope: LaunchAreaScope;
  phone?: string;
  website?: string;
  hours: string;
  eligibilityRequirements?: string;
  cost?: string;
  verificationNotes: string;
  referralRequired: boolean;
  isEmergencyService: boolean;
}

export const CITY_SHEET_CANDIDATE_SEEDS: CitySheetCandidateSeed[] = [
  {
    organizationName: 'Chester County Crisis Services (Human Needs Network)',
    category: CitySheetCategory.CRISIS_LINE,
    description:
      'County-operated crisis call center for Chester County. Per Chester County\'s official mental-health-emergency guidance, callers reaching the local crisis number can be connected to the county call center, and a Mobile Crisis Resolution Team can be dispatched to meet someone in person.',
    serviceArea: 'Chester County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '610-280-3270',
    website: 'https://www.chesco.org/1640/Emergency',
    hours:
      '24/7 per Chester County\'s official crisis guidance (phone line). A related walk-in service, the Valley Creek Crisis Walk-in Center, is separately described as operating 7:00 AM-11:00 PM — not yet confirmed whether this is the same phone number or a distinct location; pending verification.',
    referralRequired: false,
    isEmergencyService: true,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Sources: chesco.org/1640/Emergency (Chester County official site); WHYY coverage of the 988 rollout in Chester County. Not yet phone-verified by a human steward — pending A4.',
  },
  {
    organizationName: 'Legal Aid of Southeastern Pennsylvania (LASP)',
    category: CitySheetCategory.LEGAL_AID,
    description:
      'Provides free civil legal aid for low-income, vulnerable people in Bucks, Chester, Delaware & Montgomery counties, per LASP\'s own services page.',
    serviceArea: 'Bucks, Chester, Delaware & Montgomery Counties, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '877-429-5994',
    website: 'https://www.lasp.org',
    hours:
      'Helpline: Monday-Friday, 9:00 a.m.-1:00 p.m. Online applications are described as available 24/7.',
    eligibilityRequirements:
      "Described by LASP as serving \"low-income, vulnerable people\" — specific income thresholds not confirmed; pending verification.",
    cost: 'Free (per LASP\'s own description of its services as free civil legal aid)',
    referralRequired: false,
    isEmergencyService: false,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Sources: lasp.org/services; PA 211 general legal aid listing. Not yet phone-verified — pending A4.',
  },
  {
    organizationName: 'Chester County Food Bank',
    category: CitySheetCategory.FOOD_RESOURCE,
    description:
      'Operates as a hub supplying a network of community partner food cupboards throughout Chester County, rather than a single distribution site. Per the Food Bank\'s own site, residents are directed to its Food Finder map or the main phone number to be connected to the nearest partner cupboard.',
    address: '650 Pennsylvania Drive, Exton, PA 19341',
    serviceArea: 'Chester County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '610-873-6000',
    website: 'https://chestercountyfoodbank.org',
    hours:
      'Main office (donations/inquiries): Monday-Friday, 8:00 a.m.-5:00 p.m. Individual partner food cupboards have their own hours, not yet compiled — pending verification.',
    referralRequired: false,
    isEmergencyService: false,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Source: chestercountyfoodbank.org (Contact Us / Find Help pages). Not yet phone-verified — pending A4.',
  },
  {
    organizationName: 'Chester County Assistance Office',
    category: CitySheetCategory.BENEFITS_APPLICATION_SUPPORT,
    description:
      'Pennsylvania Department of Human Services county office providing SNAP, cash assistance, health care coverage, and other benefits application support for Chester County residents. A LIHEAP line (610-466-1042) and toll-free number (1-888-814-4698) are also associated with this office per the source below.',
    address: '100 James Buchanan Drive, Thorndale, PA 19372-1132',
    serviceArea: 'Chester County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '610-466-1000',
    hours:
      '8:00 a.m.-5:00 p.m. (specific days of the week not stated in the source; typically weekdays for PA County Assistance Offices, but not yet confirmed for this office).',
    referralRequired: false,
    isEmergencyService: false,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Source: aggregated search result citing Chester County Assistance Office contact details (chesco.org/1415/Contact-Us and SNAP office directories). Not yet phone-verified — pending A4.',
  },
  {
    organizationName: 'Delaware County Crisis Connections Team (DCCCT)',
    category: CitySheetCategory.CRISIS_LINE,
    description:
      'County mobile crisis team that responds 24/7 anywhere in Delaware County to assess a person in crisis and coordinate with family, police, hospitals, and other emergency personnel, per official county-affiliated crisis brochures.',
    serviceArea: 'Delaware County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '855-889-7827',
    hours: '24/7',
    referralRequired: false,
    isEmergencyService: true,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Sources: Delaware County Crisis Connections Team (DCCCT) crisis brochure, hosted via swarthmorepa.org and delcohsa.org, phone number corroborated independently across two separate searches. Not yet phone-verified — pending A4.',
  },
  {
    organizationName: 'Media Food Bank',
    category: CitySheetCategory.FOOD_RESOURCE,
    description:
      'Food pantry serving Delaware County residents, identified via a third-party food-pantry directory search rather than the organization\'s own site.',
    address: '350 W. State St., Media, PA 19063',
    serviceArea: 'Delaware County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '610-566-3172',
    hours: 'Not yet confirmed — pending phone verification.',
    referralRequired: false,
    isEmergencyService: false,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22, sourced from a third-party food-pantry directory rather than the organization\'s own site — confidence lower than other candidates in this list. Confirm the organization\'s identity and current operation carefully before relying on it (A4).',
  },
  {
    organizationName: 'Delaware County Assistance Office',
    category: CitySheetCategory.BENEFITS_APPLICATION_SUPPORT,
    description:
      'Pennsylvania Department of Human Services county office providing SNAP and other benefits application support for Delaware County residents, per Delaware County\'s official county-assistance-office page. Note: its address is in the city of Chester, PA, which is in Delaware County — not to be confused with Chester County, the other launch county.',
    address: '701 Crosby Street, Suite A, Chester, PA 19013-6099',
    serviceArea: 'Delaware County, PA',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '610-447-5500',
    website: 'https://delcopa.gov/county-assistance-office',
    hours: 'Not yet confirmed — pending phone verification.',
    referralRequired: false,
    isEmergencyService: false,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Source: delcopa.gov/county-assistance-office. Not yet phone-verified — pending A4.',
  },
  {
    organizationName: 'PA 211 (Pennsylvania 211)',
    category: CitySheetCategory.ASSISTANCE_PROGRAM,
    description:
      'Free, statewide 24/7 information-and-referral hotline connecting residents to services for food, housing, utilities, mental health, and crisis intervention, covering all PA counties including Chester and Delaware. Not itself an emergency responder, but can route callers to crisis services.',
    serviceArea: 'Statewide (Pennsylvania), including Chester and Delaware Counties',
    launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
    phone: '211',
    website: 'https://www.pa211.org',
    hours: '24/7',
    cost: 'Free',
    referralRequired: false,
    isEmergencyService: false,
    verificationNotes:
      'Candidate compiled via web research on 2026-07-22. Source: pa211.org. Not yet phone-verified — pending A4.',
  },
];
