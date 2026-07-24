import { CitySheetCategory } from '@prisma/client';
import { matchCategoriesForNeed } from './resource-matching.util';

describe('matchCategoriesForNeed', () => {
  it.each([
    ['I need help finding food for my family', CitySheetCategory.FOOD_RESOURCE],
    ['My landlord is threatening to evict me', CitySheetCategory.HOUSING_UTILITIES],
    ['I need a lawyer for a custody case', CitySheetCategory.LEGAL_AID],
    ['I lost my job and need help finding employment', CitySheetCategory.EMPLOYMENT_JOB_SEARCH],
    ['I need a bus pass to get to work', CitySheetCategory.TRANSPORTATION],
    ['I want to apply for SNAP benefits', CitySheetCategory.BENEFITS_APPLICATION_SUPPORT],
    ['I need to see a doctor but have no health insurance', CitySheetCategory.HEALTHCARE],
    ['I need financial assistance paying my bills', CitySheetCategory.ASSISTANCE_PROGRAM],
    ['I need a mailing address for my mail', CitySheetCategory.MAIL_CORRESPONDENCE_SUPPORT],
  ])('matches %j to %s', (content, expectedCategory) => {
    expect(matchCategoriesForNeed(content)).toContain(expectedCategory);
  });

  it('matches more than one category when the need spans them', () => {
    const result = matchCategoriesForNeed('I got an eviction notice and need legal help with housing');
    expect(result).toEqual(expect.arrayContaining([CitySheetCategory.LEGAL_AID, CitySheetCategory.HOUSING_UTILITIES]));
  });

  it('returns an empty array for content with no keyword match', () => {
    expect(matchCategoriesForNeed('xyz nonsense words')).toEqual([]);
  });

  it('never matches CRISIS_LINE or OTHER — those are not this function\'s job', () => {
    const result = matchCategoriesForNeed('I want to kill myself, please help me with anything');
    expect(result).not.toContain(CitySheetCategory.CRISIS_LINE);
    expect(result).not.toContain(CitySheetCategory.OTHER);
  });

  it('is case-insensitive', () => {
    expect(matchCategoriesForNeed('I NEED FOOD')).toContain(CitySheetCategory.FOOD_RESOURCE);
  });
});
