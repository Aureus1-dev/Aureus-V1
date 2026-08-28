import { OpportunityCategory } from '@prisma/client';
import { PILOT_OPPORTUNITY_SEEDS } from './pilot-seed.data';

describe('Founder Pilot Opportunity Center launch catalog', () => {
  it('contains a unique, official-HTTPS, explicitly researched launch set', () => {
    const titles = PILOT_OPPORTUNITY_SEEDS.map((seed) => seed.title);
    expect(new Set(titles).size).toBe(titles.length);

    for (const seed of PILOT_OPPORTUNITY_SEEDS) {
      expect(new URL(seed.officialSourceUrl).protocol).toBe('https:');
      if (seed.applicationUrl) expect(new URL(seed.applicationUrl).protocol).toBe('https:');

      const verifiedAt = new Date(seed.verifiedAt);
      expect(Number.isNaN(verifiedAt.getTime())).toBe(false);

      if (seed.deadline) {
        const deadline = new Date(seed.deadline);
        expect(Number.isNaN(deadline.getTime())).toBe(false);
        expect(deadline.getTime()).toBeGreaterThan(verifiedAt.getTime());
      }
    }
  });

  it('does not make low-value offer walls or a closed LIHEAP season launch dependencies', () => {
    const catalog = JSON.stringify(PILOT_OPPORTUNITY_SEEDS).toLowerCase();

    expect(catalog).not.toContain('scrambly');
    expect(catalog).not.toContain('bigcashweb');
    expect(catalog).not.toContain('big cash web');
    expect(catalog).not.toContain('swagbucks');
    expect(PILOT_OPPORTUNITY_SEEDS.map((seed) => seed.title)).not.toContain(
      'LIHEAP — Help With Heating and Utility Bills',
    );
  });

  it('covers the launch economic-help ladder rather than one kind of payout', () => {
    const categories = new Set(PILOT_OPPORTUNITY_SEEDS.map((seed) => seed.category));

    expect(categories.has(OpportunityCategory.GOVERNMENT_BENEFIT)).toBe(true);
    expect(categories.has(OpportunityCategory.FINANCIAL_ASSISTANCE)).toBe(true);
    expect(categories.has(OpportunityCategory.HOUSING)).toBe(true);
    expect(categories.has(OpportunityCategory.EMPLOYMENT)).toBe(true);
    expect(categories.has(OpportunityCategory.EDUCATION)).toBe(true);
    expect(categories.has(OpportunityCategory.BANKING_INCENTIVE)).toBe(true);
  });

  it('keeps banking bonuses clearly out of the emergency-cash lane', () => {
    const banking = PILOT_OPPORTUNITY_SEEDS.filter(
      (seed) => seed.category === OpportunityCategory.BANKING_INCENTIVE,
    );

    expect(banking.length).toBeGreaterThan(0);
    for (const seed of banking) {
      expect(seed.tags).toContain('not same day');
      expect(seed.fullDescription.toLowerCase()).toMatch(/not (emergency|quick)/);
      expect(seed.benefitAmount).toBeTruthy();
      expect(seed.deadline).toBeTruthy();
    }
  });

  it('includes high-impact zero-affiliate paths for money owed, utility hardship, housing, and paid training', () => {
    const titles = new Set(PILOT_OPPORTUNITY_SEEDS.map((seed) => seed.title));

    expect(titles.has('Pennsylvania Unclaimed Property — Search for Money Owed to You')).toBe(true);
    expect(titles.has('Philadelphia Water Customer Assistance — TAP and Shutoff Protection')).toBe(true);
    expect(titles.has('Philadelphia Rent and Homelessness Prevention Assistance')).toBe(true);
    expect(titles.has('Philadelphia Home Repair Academy — Paid Trades Training')).toBe(true);
  });
});
