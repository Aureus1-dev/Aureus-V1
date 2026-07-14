import { Injectable } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

export interface ScoringInput {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  organizationName?: string;
  officialSourceUrl?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  state?: string | null;
  tags?: string[];
  eligibilityNotes?: string | null;
  verificationStatus?: VerificationStatus;
  dateLastVerified?: Date | null;
  updatedAt?: Date;
}

/**
 * Computes confidence and freshness scores for Resource records.
 * Pure service — no database access; easily testable.
 * Mirrors OpportunityScoringService's formula shape (ADR-004) adapted to
 * Resource Directory fields (PA-014).
 *
 * Confidence (0–100):
 *   40 pts  — Required fields complete (title, shortDesc, fullDesc, organizationName, officialSourceUrl)
 *   35 pts  — Optional enrichment (contact info, location/city, country, state, tags, eligibilityNotes)
 *   25 pts  — Steward verified
 *
 * Freshness (0–100):
 *   100     — Verified or updated within 7 days
 *   Linear decay to 0 at 365 days from the reference date (dateLastVerified ?? updatedAt)
 */
@Injectable()
export class ResourceScoringService {
  private static readonly REQUIRED_FIELDS = [
    'title', 'shortDescription', 'fullDescription',
    'organizationName', 'officialSourceUrl',
  ] as const;

  private static readonly PERFECT_DAYS = 7;
  private static readonly ZERO_DAYS = 365;

  computeConfidence(input: ScoringInput): number {
    let score = 0;

    // Required field completeness — 40 pts
    const completedRequired = ResourceScoringService.REQUIRED_FIELDS
      .filter(f => !!input[f as keyof ScoringInput])
      .length;
    score += Math.round((completedRequired / ResourceScoringService.REQUIRED_FIELDS.length) * 40);

    // Optional enrichment — 35 pts
    if (input.contactEmail || input.contactPhone) score += 10;
    if (input.location || input.city)             score += 5;
    if (input.country)                             score += 5;
    if (input.state)                               score += 5;
    if (input.tags?.length)                        score += 5;
    if (input.eligibilityNotes)                    score += 5;

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

    if (daysSince <= ResourceScoringService.PERFECT_DAYS) return 100;
    if (daysSince >= ResourceScoringService.ZERO_DAYS)    return 0;

    const decay = (daysSince - ResourceScoringService.PERFECT_DAYS)
      / (ResourceScoringService.ZERO_DAYS - ResourceScoringService.PERFECT_DAYS);
    return Math.round(100 * (1 - decay));
  }
}
