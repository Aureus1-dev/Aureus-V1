import { BenefitType, OpportunityCategory, OpportunityStatus, SourceType, VerificationStatus } from '@prisma/client';
import type { OpportunityActionResponseDto } from '../dto/opportunity-action-response.dto';
import type { OpportunityResponseDto } from '../dto/opportunity-response.dto';
import { applyTemporaryProviderRail } from './opportunity-provider-adapter';

const NOW = new Date('2026-08-27T12:00:00.000Z');

function opportunity(provider: string): OpportunityResponseDto {
  return {
    id: 'opp-1',
    opportunityRef: 'AUR-OPP-000001',
    title: 'Earn extra money',
    shortDescription: 'Complete offers for extra cash.',
    fullDescription: 'Temporary provider rail fixture.',
    category: OpportunityCategory.FINANCIAL_ASSISTANCE,
    tags: ['cash', 'offers'],
    provider,
    officialSourceUrl: 'https://provider.example/',
    applicationUrl: 'https://provider.example/signup',
    location: null,
    country: 'US',
    state: null,
    eligibilityRules: 'See provider terms.',
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
    sourceName: 'Provider site',
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
    title: 'Earn extra money',
    provider: 'Provider',
    url: 'https://provider.example/signup',
    canonicalUrl: 'https://provider.example/signup',
    referralUrl: null,
    affiliateDisclosure: null,
    eligibility: 'See provider terms.',
    geography: 'US',
    payoutNotes: null,
    timeToCashNotes: null,
    status: 'verified',
    lastVerifiedAt: NOW,
    sourceName: 'Provider site',
    sourceUrl: 'https://provider.example/',
    sourceType: SourceType.EXTERNAL_SOURCE,
  };
}

describe('temporary Opportunity provider adapters — Issue #95 §2', () => {
  it('decorates Scrambly only when a founder-supplied HTTPS referral URL is configured', () => {
    const result = applyTemporaryProviderRail(
      opportunity('Scrambly'),
      action(),
      { SCRAMBLY_REFERRAL_URL: 'https://go.example/scrambly-ref' },
    );

    expect(result.url).toBe('https://go.example/scrambly-ref');
    expect(result.canonicalUrl).toBe('https://provider.example/signup');
    expect(result.referralUrl).toBe('https://go.example/scrambly-ref');
    expect(result.affiliateDisclosure).toMatch(/does not affect which opportunity we recommend/i);
  });

  it('supports BigCashWeb without coupling Hall to provider-specific UX', () => {
    const result = applyTemporaryProviderRail(
      opportunity('Big Cash Web'),
      action(),
      { BIGCASHWEB_REFERRAL_URL: 'https://go.example/bigcash-ref' },
    );

    expect(result.url).toBe('https://go.example/bigcash-ref');
    expect(result.referralUrl).toBe('https://go.example/bigcash-ref');
  });

  it('leaves the canonical action untouched when no referral URL is supplied', () => {
    const original = action();
    const result = applyTemporaryProviderRail(opportunity('Scrambly'), original, {});

    expect(result).toEqual(original);
  });

  it('fails closed on unsafe or non-HTTPS referral configuration', () => {
    const original = action();

    expect(
      applyTemporaryProviderRail(
        opportunity('Scrambly'),
        original,
        { SCRAMBLY_REFERRAL_URL: 'javascript:alert(1)' },
      ),
    ).toEqual(original);

    expect(
      applyTemporaryProviderRail(
        opportunity('Scrambly'),
        original,
        { SCRAMBLY_REFERRAL_URL: 'http://insecure.example/ref' },
      ),
    ).toEqual(original);
  });

  it('keeps Swagbucks optional until a verified/current rail is deliberately configured', () => {
    const original = action();
    expect(applyTemporaryProviderRail(opportunity('Swagbucks'), original, {})).toEqual(original);

    const configured = applyTemporaryProviderRail(
      opportunity('Swagbucks'),
      original,
      { SWAGBUCKS_REFERRAL_URL: 'https://go.example/swagbucks-ref' },
    );
    expect(configured.referralUrl).toBe('https://go.example/swagbucks-ref');
  });

  it('never decorates a stale action even if a referral URL is configured', () => {
    const stale = { ...action(), status: 'stale' as const };
    const result = applyTemporaryProviderRail(
      opportunity('Scrambly'),
      stale,
      { SCRAMBLY_REFERRAL_URL: 'https://go.example/scrambly-ref' },
    );

    expect(result).toEqual(stale);
  });
});
