import { BadRequestException } from '@nestjs/common';
import { HarvestFilingStatus } from '@prisma/client';
import { HarvestTaxEngineService } from './harvest-tax-engine.service';

describe('HarvestTaxEngineService', () => {
  const service = new HarvestTaxEngineService();

  it('applies the 2026 90% federal gambling-loss limit', () => {
    const result = service.estimate({
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus: HarvestFilingStatus.SINGLE,
      otherTaxableIncomeCents: 7_000_000,
      itemizedDeductionsBeforeGamblingCents: 0,
      gamblingWinningsCents: 2_800_000,
      deductibleGamblingLossesCents: 2_646_000,
    });

    expect(result.allowedFederalLossDeductionCents).toBe(2_381_400);
    expect(result.federalTaxCents).toBeGreaterThan(0);
    expect(result.recommendedReserveCents).toBeGreaterThan(
      result.federalTaxCents + result.stateTaxCents,
    );
  });

  it('uses Pennsylvania same-year net gambling income for the state estimate', () => {
    const result = service.estimate({
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus: HarvestFilingStatus.SINGLE,
      otherTaxableIncomeCents: 0,
      itemizedDeductionsBeforeGamblingCents: 0,
      gamblingWinningsCents: 200_000,
      deductibleGamblingLossesCents: 150_000,
    });

    expect(result.stateTaxCents).toBe(1_535);
  });

  it('fails closed for a year or jurisdiction without a reviewed rule pack', () => {
    expect(() =>
      service.estimate({
        taxYear: 2027,
        jurisdictionState: 'PA',
        filingStatus: HarvestFilingStatus.SINGLE,
        otherTaxableIncomeCents: 0,
        itemizedDeductionsBeforeGamblingCents: 0,
        gamblingWinningsCents: 0,
        deductibleGamblingLossesCents: 0,
      }),
    ).toThrow(BadRequestException);
  });
});
