import { Test } from '@nestjs/testing';
import { VerificationStatus } from '@prisma/client';
import { OpportunityScoringService, ScoringInput } from './opportunity-scoring.service';

const fullInput: ScoringInput = {
  title: 'Pell Grant',
  shortDescription: 'Federal grant for students',
  fullDescription: 'The Federal Pell Grant provides need-based aid',
  provider: 'U.S. Department of Education',
  officialSourceUrl: 'https://studentaid.gov',
  eligibilityRules: 'Must demonstrate financial need',
  benefitType: 'GRANT',
  applicationUrl: 'https://fafsa.gov',
  location: 'Nationwide',
  country: 'United States',
  deadline: new Date('2026-12-31'),
  benefitAmount: 'Up to $7,395',
  tags: ['federal', 'undergraduate'],
  verificationStatus: VerificationStatus.VERIFIED,
  dateLastVerified: new Date(),
};

describe('OpportunityScoringService', () => {
  let service: OpportunityScoringService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({ providers: [OpportunityScoringService] }).compile();
    service = m.get(OpportunityScoringService);
  });

  // ── Confidence ─────────────────────────────────────────────────────────

  describe('computeConfidence', () => {
    it('returns 100 for a fully enriched verified opportunity', () => {
      expect(service.computeConfidence(fullInput)).toBe(100);
    });

    it('scores 40 for required fields only, no enrichment, no verification', () => {
      const input: ScoringInput = {
        title: 'T', shortDescription: 'S', fullDescription: 'F',
        provider: 'P', officialSourceUrl: 'https://x.com',
        eligibilityRules: 'E', benefitType: 'GRANT',
        verificationStatus: VerificationStatus.DRAFT,
      };
      expect(service.computeConfidence(input)).toBe(40);
    });

    it('adds 25 pts for VERIFIED status', () => {
      const base: ScoringInput = {
        title: 'T', shortDescription: 'S', fullDescription: 'F',
        provider: 'P', officialSourceUrl: 'https://x.com',
        eligibilityRules: 'E', benefitType: 'GRANT',
        verificationStatus: VerificationStatus.VERIFIED,
      };
      expect(service.computeConfidence(base)).toBe(65);
    });

    it('adds 10 pts for applicationUrl', () => {
      const input: ScoringInput = {
        title: 'T', shortDescription: 'S', fullDescription: 'F',
        provider: 'P', officialSourceUrl: 'https://x.com',
        eligibilityRules: 'E', benefitType: 'GRANT',
        applicationUrl: 'https://apply.com',
        verificationStatus: VerificationStatus.DRAFT,
      };
      expect(service.computeConfidence(input)).toBe(50);
    });

    it('returns 0 when no fields provided', () => {
      expect(service.computeConfidence({})).toBe(0);
    });

    it('caps score at 100', () => {
      // Should not exceed 100 even with every field
      expect(service.computeConfidence(fullInput)).toBeLessThanOrEqual(100);
    });

    it('does not count PENDING_REVIEW as verified', () => {
      const input: ScoringInput = { ...fullInput, verificationStatus: VerificationStatus.PENDING_REVIEW };
      expect(service.computeConfidence(input)).toBe(75); // 40+35 no verification bonus
    });
  });

  // ── Freshness ──────────────────────────────────────────────────────────

  describe('computeFreshness', () => {
    it('returns 100 when dateLastVerified is today', () => {
      expect(service.computeFreshness({ dateLastVerified: new Date() })).toBe(100);
    });

    it('returns 100 when verified within 7 days', () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);
      expect(service.computeFreshness({ dateLastVerified: sixDaysAgo })).toBe(100);
    });

    it('returns 0 when last verified >= 365 days ago', () => {
      const oldDate = new Date(Date.now() - 400 * 86_400_000);
      expect(service.computeFreshness({ dateLastVerified: oldDate })).toBe(0);
    });

    it('decays linearly between 7 and 365 days', () => {
      const midpoint = new Date(Date.now() - 186 * 86_400_000); // ~186 days
      const score = service.computeFreshness({ dateLastVerified: midpoint });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('returns 0 when no reference date', () => {
      expect(service.computeFreshness({})).toBe(0);
    });

    it('uses updatedAt as fallback when dateLastVerified is absent', () => {
      const score = service.computeFreshness({ updatedAt: new Date() });
      expect(score).toBe(100);
    });
  });
});
