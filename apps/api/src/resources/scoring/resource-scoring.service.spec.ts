import { VerificationStatus } from '@prisma/client';
import { ResourceScoringService } from './resource-scoring.service';

describe('ResourceScoringService', () => {
  let service: ResourceScoringService;

  beforeEach(() => {
    service = new ResourceScoringService();
  });

  describe('computeConfidence', () => {
    it('awards 40 pts for complete required fields with nothing else', () => {
      const score = service.computeConfidence({
        title: 'Legal Aid', shortDescription: 'S', fullDescription: 'F',
        organizationName: 'Org', officialSourceUrl: 'https://example.org',
      });
      expect(score).toBe(40);
    });

    it('awards partial credit for incomplete required fields', () => {
      const score = service.computeConfidence({ title: 'Legal Aid' });
      expect(score).toBe(8); // 1/5 * 40 = 8
    });

    it('adds enrichment points for contact, location, tags, eligibility', () => {
      const score = service.computeConfidence({
        title: 'Legal Aid', shortDescription: 'S', fullDescription: 'F',
        organizationName: 'Org', officialSourceUrl: 'https://example.org',
        contactEmail: 'a@b.com', city: 'Austin', country: 'US', state: 'TX',
        tags: ['free'], eligibilityNotes: 'Open to all',
      });
      expect(score).toBe(75); // 40 + 10 + 5 + 5 + 5 + 5 + 5
    });

    it('adds 25 pts when VERIFIED', () => {
      const score = service.computeConfidence({
        title: 'Legal Aid', shortDescription: 'S', fullDescription: 'F',
        organizationName: 'Org', officialSourceUrl: 'https://example.org',
        verificationStatus: VerificationStatus.VERIFIED,
      });
      expect(score).toBe(65);
    });

    it('never exceeds 100', () => {
      const score = service.computeConfidence({
        title: 'Legal Aid', shortDescription: 'S', fullDescription: 'F',
        organizationName: 'Org', officialSourceUrl: 'https://example.org',
        contactEmail: 'a@b.com', contactPhone: '555', city: 'Austin', country: 'US',
        state: 'TX', tags: ['free'], eligibilityNotes: 'Open to all',
        verificationStatus: VerificationStatus.VERIFIED,
      });
      expect(score).toBe(100);
    });
  });

  describe('computeFreshness', () => {
    it('returns 0 with no reference date', () => {
      expect(service.computeFreshness({})).toBe(0);
    });

    it('returns 100 within the perfect window', () => {
      const now = new Date();
      expect(service.computeFreshness({ dateLastVerified: now })).toBe(100);
    });

    it('returns 0 at or beyond the zero-decay window', () => {
      const old = new Date(Date.now() - 400 * 86_400_000);
      expect(service.computeFreshness({ dateLastVerified: old })).toBe(0);
    });

    it('decays linearly between the perfect and zero windows', () => {
      const mid = new Date(Date.now() - 186 * 86_400_000); // halfway between 7 and 365
      const score = service.computeFreshness({ dateLastVerified: mid });
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(60);
    });

    it('prefers dateLastVerified over updatedAt', () => {
      const recent = new Date();
      const old = new Date(Date.now() - 400 * 86_400_000);
      expect(service.computeFreshness({ dateLastVerified: recent, updatedAt: old })).toBe(100);
    });
  });
});
