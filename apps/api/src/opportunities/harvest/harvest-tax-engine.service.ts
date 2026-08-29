import { BadRequestException, Injectable } from '@nestjs/common';
import { HarvestFilingStatus } from '@prisma/client';

interface TaxBracket {
  upToCents: number | null;
  rateBps: number;
}

interface TaxRulePack {
  standardDeductionCents: Record<HarvestFilingStatus, number>;
  brackets: Record<HarvestFilingStatus, TaxBracket[]>;
  federalLossDeductionBps: number;
  stateRateBps: number;
  sources: {
    federalRates: string;
    federalGamblingLosses: string;
    stateGambling: string;
    verifiedAt: string;
  };
}

export interface HarvestTaxEstimateInput {
  taxYear: number;
  jurisdictionState: string;
  filingStatus: HarvestFilingStatus;
  otherTaxableIncomeCents: number;
  itemizedDeductionsBeforeGamblingCents: number;
  gamblingWinningsCents: number;
  deductibleGamblingLossesCents: number;
}

export interface HarvestTaxEstimate {
  federalTaxCents: number;
  stateTaxCents: number;
  allowedFederalLossDeductionCents: number;
  recommendedReserveCents: number;
  sourceVerifiedAt: string;
  sources: TaxRulePack['sources'];
}

const dollars = (amount: number): number => amount * 100;

const RULES_2026_PA: TaxRulePack = {
  standardDeductionCents: {
    SINGLE: dollars(16_100),
    MARRIED_FILING_JOINTLY: dollars(32_200),
    HEAD_OF_HOUSEHOLD: dollars(24_150),
    MARRIED_FILING_SEPARATELY: dollars(16_100),
  },
  brackets: {
    SINGLE: [
      { upToCents: dollars(12_400), rateBps: 1000 },
      { upToCents: dollars(50_400), rateBps: 1200 },
      { upToCents: dollars(105_700), rateBps: 2200 },
      { upToCents: dollars(201_775), rateBps: 2400 },
      { upToCents: dollars(256_225), rateBps: 3200 },
      { upToCents: dollars(640_600), rateBps: 3500 },
      { upToCents: null, rateBps: 3700 },
    ],
    MARRIED_FILING_JOINTLY: [
      { upToCents: dollars(24_800), rateBps: 1000 },
      { upToCents: dollars(100_800), rateBps: 1200 },
      { upToCents: dollars(211_400), rateBps: 2200 },
      { upToCents: dollars(403_550), rateBps: 2400 },
      { upToCents: dollars(512_450), rateBps: 3200 },
      { upToCents: dollars(768_700), rateBps: 3500 },
      { upToCents: null, rateBps: 3700 },
    ],
    HEAD_OF_HOUSEHOLD: [
      { upToCents: dollars(17_700), rateBps: 1000 },
      { upToCents: dollars(67_450), rateBps: 1200 },
      { upToCents: dollars(105_700), rateBps: 2200 },
      { upToCents: dollars(201_750), rateBps: 2400 },
      { upToCents: dollars(256_200), rateBps: 3200 },
      { upToCents: dollars(640_600), rateBps: 3500 },
      { upToCents: null, rateBps: 3700 },
    ],
    MARRIED_FILING_SEPARATELY: [
      { upToCents: dollars(12_400), rateBps: 1000 },
      { upToCents: dollars(50_400), rateBps: 1200 },
      { upToCents: dollars(105_700), rateBps: 2200 },
      { upToCents: dollars(201_775), rateBps: 2400 },
      { upToCents: dollars(256_225), rateBps: 3200 },
      { upToCents: dollars(384_350), rateBps: 3500 },
      { upToCents: null, rateBps: 3700 },
    ],
  },
  federalLossDeductionBps: 9000,
  stateRateBps: 307,
  sources: {
    federalRates: 'https://www.irs.gov/pub/irs-pdf/f1040es.pdf',
    federalGamblingLosses: 'https://www.irs.gov/publications/p505',
    stateGambling:
      'https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/gambling-and-lottery-winnings',
    verifiedAt: '2026-08-29',
  },
};

@Injectable()
export class HarvestTaxEngineService {
  estimate(input: HarvestTaxEstimateInput): HarvestTaxEstimate {
    const rules = this.rules(input.taxYear, input.jurisdictionState);
    const standardDeduction = rules.standardDeductionCents[input.filingStatus];

    const baseDeduction = Math.max(
      standardDeduction,
      input.itemizedDeductionsBeforeGamblingCents,
    );
    const baseTaxableIncome = Math.max(
      0,
      input.otherTaxableIncomeCents - baseDeduction,
    );
    const baseFederalTax = this.progressiveTax(
      baseTaxableIncome,
      rules.brackets[input.filingStatus],
    );

    const allowedFederalLossDeductionCents = Math.min(
      Math.floor(
        (input.deductibleGamblingLossesCents * rules.federalLossDeductionBps) /
          10_000,
      ),
      input.gamblingWinningsCents,
    );

    const withGamblingDeduction = Math.max(
      standardDeduction,
      input.itemizedDeductionsBeforeGamblingCents +
        allowedFederalLossDeductionCents,
    );
    const withGamblingTaxableIncome = Math.max(
      0,
      input.otherTaxableIncomeCents +
        input.gamblingWinningsCents -
        withGamblingDeduction,
    );
    const withGamblingFederalTax = this.progressiveTax(
      withGamblingTaxableIncome,
      rules.brackets[input.filingStatus],
    );
    const federalTaxCents = Math.max(
      0,
      withGamblingFederalTax - baseFederalTax,
    );

    const paNetGamblingIncomeCents = Math.max(
      0,
      input.gamblingWinningsCents - input.deductibleGamblingLossesCents,
    );
    const stateTaxCents = Math.round(
      (paNetGamblingIncomeCents * rules.stateRateBps) / 10_000,
    );

    const deterministicEstimate = federalTaxCents + stateTaxCents;
    const recommendedReserveCents = Math.ceil(deterministicEstimate * 1.1);

    return {
      federalTaxCents,
      stateTaxCents,
      allowedFederalLossDeductionCents,
      recommendedReserveCents,
      sourceVerifiedAt: rules.sources.verifiedAt,
      sources: rules.sources,
    };
  }

  private rules(taxYear: number, jurisdictionState: string): TaxRulePack {
    if (taxYear !== 2026 || jurisdictionState.toUpperCase() !== 'PA') {
      throw new BadRequestException(
        'No reviewed harvest tax rule pack exists for that year and jurisdiction.',
      );
    }
    return RULES_2026_PA;
  }

  private progressiveTax(
    taxableIncomeCents: number,
    brackets: TaxBracket[],
  ): number {
    let lower = 0;
    let tax = 0;

    for (const bracket of brackets) {
      const upper = bracket.upToCents;
      const amount =
        upper === null
          ? Math.max(0, taxableIncomeCents - lower)
          : Math.max(0, Math.min(taxableIncomeCents, upper) - lower);

      tax += Math.round((amount * bracket.rateBps) / 10_000);

      if (upper === null || taxableIncomeCents <= upper) break;
      lower = upper;
    }

    return tax;
  }
}
