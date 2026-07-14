import { Injectable } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

export interface ScoringInput {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  provider?: string;
  officialSourceUrl?: string;
  eligibilityRules?: string;
  benefitType?: string;
  applicationUrl?: string | null;
  location?: string | null;
  country?: string | null;
  deadline?: Date | null;
  benefitAmount?: string | null;
  tags?: string[];
  verificationStatus?: VerificationStatus;
  dateLastVerified?: Date | null;
  updatedAt?: Date;
}

/**
 * Computes confidence and freshness scores for Opportunity records.
 * Pure service — no database access; easily testable.
 *
 * Confidence (0–100):
 *   40 pts  — Required fields complete (title, shortDesc, fullDesc, provider, sourceUrl, eligibility, benefitType)
 *   35 pts  — Optional enrichment (applicationUrl, location, country, deadline, amount, tags)
 *   25 pts  — Steward verified
 *
 * Freshness (0–100):
 *   100     — Verified or updated within 7 days
 *   Linear decay to 0 at 365 days from the reference date (dateLastVerified ?? updatedAt)
 */
@Injectable()
export class OpportunityScoringService {
  private static readonly REQUIRED_FIELDS = [
    'title', 'shortDescription', 'fullDescription',
    'provider', 'officialSourceUrl', 'eligibilityRules', 'benefitType',
  ] as const;

  private static readonly PERFECT_DAYS = 7;
  private static readonly ZERO_DAYS = 365;

  computeConfidence(input: ScoringInput): number {
    let score = 0;

    // Required field completeness — 40 pts
    const completedRequired = OpportunityScoringService.REQUIRED_FIELDS
      .filter(f => !!input[f as keyof ScoringInput])
      .length;
    score += Math.round((completedRequired / OpportunityScoringService.REQUIRED_FIELDS.length) * 40);

    // Optional enrichment — 35 pts
    if (input.applicationUrl) score += 10;
    if (input.location)       score += 5;
    if (input.country)        score += 5;
    if (input.deadline)       score += 5;
    if (input.benefitAmount)  score += 5;
    if (input.tags?.length)   score += 5;

    // Steward verification — 25 pts
    if (input.verificationStatus === VerificationStatus.VERIFIED) score += 25;

    return Math.min(100, Math.round(score));
  }

  computeFreshness(input: ScoringInput): number {
    const reference = input.dateLastVerified ?? input.updatedAt;
    if (!reference) return 0;

    const daysSince = Math.floor(
      (Date.now() - reference.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince <= OpportunityScoringService.PERFECT_DAYS) return 100;
    if (daysSince >= OpportunityScoringService.ZERO_DAYS)    return 0;

    const decay = (daysSince - OpportunityScoringService.PERFECT_DAYS)
      / (OpportunityScoringService.ZERO_DAYS - OpportunityScoringService.PERFECT_DAYS);
    return Math.round(100 * (1 - decay));
  }
}
