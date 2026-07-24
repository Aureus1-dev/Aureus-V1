import { CitySheetCategory } from '@prisma/client';

/**
 * Gate C (C4: Resource discovery). Matching a stated need's own words to a
 * City Sheet category is deterministic — a documented, reviewable keyword
 * list per category — for the same reason C2/C3 avoid model judgment:
 * "correctly matches" is a guarantee only a deterministic check can make.
 * A need may match more than one category (e.g. an eviction notice is both
 * housing and legal); it may also match none, which is an honest "no
 * keyword hit" result, not a guess — Gate C's later work orders (C5's
 * presentation, C7's safe failure) are what handle an empty match, not this
 * function.
 */
const CATEGORY_KEYWORDS: Record<CitySheetCategory, string[]> = {
  [CitySheetCategory.CRISIS_LINE]: [],
  [CitySheetCategory.ASSISTANCE_PROGRAM]: ['assistance', 'financial help', 'financial assistance', 'help paying'],
  [CitySheetCategory.LEGAL_AID]: ['legal', 'lawyer', 'attorney', 'court', 'eviction notice', 'custody', 'immigration status'],
  [CitySheetCategory.FOOD_RESOURCE]: ['food', 'hungry', 'hunger', 'groceries', 'meal', 'pantry'],
  [CitySheetCategory.HOUSING_UTILITIES]: ['housing', 'rent', 'evict', 'shelter', 'homeless', 'utility', 'utilities', 'electric bill', 'heating bill'],
  [CitySheetCategory.EMPLOYMENT_JOB_SEARCH]: ['job', 'employment', 'work', 'resume', 'career', 'hiring'],
  [CitySheetCategory.TRANSPORTATION]: ['transportation', 'bus pass', 'ride to', 'car repair', 'gas money'],
  [CitySheetCategory.BENEFITS_APPLICATION_SUPPORT]: ['benefits', 'snap', 'medicaid', 'welfare', 'food stamps', 'cash assistance'],
  [CitySheetCategory.MAIL_CORRESPONDENCE_SUPPORT]: ['mail', 'mailing address', 'correspondence'],
  [CitySheetCategory.HEALTHCARE]: ['healthcare', 'health care', 'doctor', 'medical', 'clinic', 'health insurance', 'prescription'],
  [CitySheetCategory.OTHER]: [],
};

/** Returns every City Sheet category whose keyword list matches the need's content. Never guesses OTHER or CRISIS_LINE — crisis routing is C3's job, not C4's. */
export function matchCategoriesForNeed(content: string): CitySheetCategory[] {
  const normalized = content.trim().toLowerCase();
  return (Object.keys(CATEGORY_KEYWORDS) as CitySheetCategory[]).filter((category) =>
    CATEGORY_KEYWORDS[category].some((keyword) => normalized.includes(keyword)),
  );
}
