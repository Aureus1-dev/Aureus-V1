import { BenefitType, OpportunityCategory, OpportunityStatus, SourceType, VerificationStatus } from '@prisma/client';
import type { OpportunityActionResponseDto } from '../dto/opportunity-action-response.dto';
import type { OpportunityResponseDto } from '../dto/opportunity-response.dto';
import { applyCommercialDestination } from './opportunity-provider-adapter';

const NOW = new Date('2026-08-28T12:28:00.000Z');

function opportunity(provider = 'Official Provider'): OpportunityResponseDto {
  return {
    id: 'opp-1',
    opportunityRef: 'AUR-OPP-000001',
    title: 'High-value member opportunity',
    shortDescription: 'Official opportunity.',
    fullDescription: 'Official opportunity fixture.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    tags: ['member value'],
    provider,
    officialSourceUrl: 'https://provider.example/',
    applicationUrl: 'https://provider.example/signup',
    location: null,
    country: 'US',
    state: null,
    eligibilityRules: 'See official terms.',
    benefitType: BenefitType.OTHER,
    benefitAmount: null,
    deadline: null,
    status: OpportunityStatus.ACTIVE,
    verificationStatus: VerificationStatus.VERIFIED,
    rejectionReason: null,
    confidenceScore: 90,
    freshnessScore: 90,
    datePublished: NOW,
    dateLastVerified: NOW,
    sourceName: 'Official source',
    sourceUrl: 'https://provider.example/',
    sourceType: SourceType.EXTERNAL_SOURCE,
    submittedById: '00000000-0000-0000-0000-000000000001',
    createdById: '00000000-0000-0000-0000-000000000001',
    lastUpdatedById: '00000000-0000-0000-0000-000000000001',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  } as OpportunityResponseDto;
}

function action(): OpportunityActionResponseDto {
  return {
    opportunityId: 'opp-1',
    opportunityRef: 'AUR-OPP-000001',
    title: 'High-value member opportunity',
    provider: 'Official Provider',
    url: 'https://provider.example/signup',
    canonicalUrl: 'https://provider.example/signup',
    referralUrl: null,
    affiliateDisclosure: null,
    eligibility: 'See official terms.',
    geography: 'US',
    payoutNotes: null,
    timeToCashNotes: null,
    status: 'verified',
    lastVerifiedAt: NOW,
    sourceName: 'Official source',
    sourceUrl: 'https://provider.example/',
    sourceType: SourceType.EXTERNAL_SOURCE,
  };
}

describe('provider-neutral Opportunity commercial destinations — Issue #95 §2', () => {
  it('decorates an already-selected verified action only on an exact canonical URL match', () => {
    const result = applyCommercialDestination(opportunity(), action(), {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: JSON.stringify({
        'https://provider.example/signup': 'https://partner.example/ref',
      }),
    });

    expect(result.url).toBe('https://partner.example/ref');
    expect(result.canonicalUrl).toBe('https://provider.example/signup');
    expect(result.referralUrl).toBe('https://partner.example/ref');
    expect(result.affiliateDisclosure).toMatch(/does not affect which opportunity we recommend/i);
  });

  it('is provider-neutral: provider identity does not control whether the exact destination can be decorated', () => {
    const env = {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: JSON.stringify({
        'https://provider.example/signup': 'https://partner.example/ref',
      }),
    };

    expect(applyCommercialDestination(opportunity('Bank'), action(), env).referralUrl).toBe('https://partner.example/ref');
    expect(applyCommercialDestination(opportunity('Training Partner'), action(), env).referralUrl).toBe('https://partner.example/ref');
  });

  it('leaves the canonical action untouched when no commercial destination is configured', () => {
    const original = action();
    expect(applyCommercialDestination(opportunity(), original, {})).toEqual(original);
  });

  it('fails closed on malformed JSON, mismatched canonical URLs, and unsafe destinations', () => {
    const original = action();

    expect(applyCommercialDestination(opportunity(), original, {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: '{bad json',
    })).toEqual(original);

    expect(applyCommercialDestination(opportunity(), original, {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: JSON.stringify({
        'https://different.example/signup': 'https://partner.example/ref',
      }),
    })).toEqual(original);

    expect(applyCommercialDestination(opportunity(), original, {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: JSON.stringify({
        'https://provider.example/signup': 'javascript:alert(1)',
      }),
    })).toEqual(original);

    expect(applyCommercialDestination(opportunity(), original, {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: JSON.stringify({
        'https://provider.example/signup': 'http://insecure.example/ref',
      }),
    })).toEqual(original);
  });

  it('never decorates a stale action even if a commercial destination exists', () => {
    const stale = { ...action(), status: 'stale' as const };
    const result = applyCommercialDestination(opportunity(), stale, {
      OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON: JSON.stringify({
        'https://provider.example/signup': 'https://partner.example/ref',
      }),
    });

    expect(result).toEqual(stale);
  });
});
