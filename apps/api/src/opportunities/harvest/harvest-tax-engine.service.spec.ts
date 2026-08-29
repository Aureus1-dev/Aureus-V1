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

  it.each([
    [HarvestFilingStatus.SINGLE, 1_610_000],
    [HarvestFilingStatus.MARRIED_FILING_JOINTLY, 3_220_000],
    [HarvestFilingStatus.HEAD_OF_HOUSEHOLD, 2_415_000],
    [HarvestFilingStatus.MARRIED_FILING_SEPARATELY, 1_610_000],
  ])('applies the reviewed standard deduction for %s', (filingStatus, standardDeductionCents) => {
    const result = service.estimate({
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus,
      otherTaxableIncomeCents: standardDeductionCents,
      itemizedDeductionsBeforeGamblingCents: 0,
      gamblingWinningsCents: 10_000,
      deductibleGamblingLossesCents: 0,
    });
    expect(result.federalTaxCents).toBe(1_000);
  });

  it('crosses the Single 10% to 12% bracket boundary correctly', () => {
    const result = service.estimate({
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus: HarvestFilingStatus.SINGLE,
      otherTaxableIncomeCents: 1_610_000 + 1_240_000,
      itemizedDeductionsBeforeGamblingCents: 0,
      gamblingWinningsCents: 10_000,
      deductibleGamblingLossesCents: 0,
    });
    expect(result.federalTaxCents).toBe(1_200);
  });

  it('switches from the standard deduction to itemizing when gambling losses make itemizing larger', () => {
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
    expect(result.federalTaxCents).toBe(446_300);
  });

  it('preserves pre-existing itemized deductions when they already exceed the standard deduction', () => {
    const result = service.estimate({
      taxYear: 2026,
      jurisdictionState: 'PA',
      filingStatus: HarvestFilingStatus.SINGLE,
      otherTaxableIncomeCents: 10_000_000,
      itemizedDeductionsBeforeGamblingCents: 3_000_000,
      gamblingWinningsCents: 100_000,
      deductibleGamblingLossesCents: 0,
    });
    expect(result.federalTaxCents).toBe(22_000);
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
