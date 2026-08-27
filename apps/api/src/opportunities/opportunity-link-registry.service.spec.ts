import { BenefitType, OpportunityCategory, OpportunityStatus, SourceType, VerificationStatus } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';
import {
  inferOpportunityCategory,
  isOpportunityActionRequest,
  OpportunityLinkRegistryService,
} from './opportunity-link-registry.service';
import type { OpportunityResponseDto } from './dto/opportunity-response.dto';
import type { OpportunityProviderAdapterRegistryService } from './providers/opportunity-provider-adapter';

const NOW = new Date();

function opportunity(overrides: Partial<OpportunityResponseDto> = {}): OpportunityResponseDto {
  return {
    id: 'opp-1',
    opportunityRef: 'AUR-OPP-000001',
    title: 'Warehouse Associate',
    shortDescription: 'Immediate hiring for warehouse work.',
    fullDescription: 'Full time warehouse job.',
    category: OpportunityCategory.EMPLOYMENT,
    tags: ['job', 'warehouse'],
    provider: 'Example Employer',
    officialSourceUrl: 'https://example.org/jobs',
    applicationUrl: 'https://example.org/jobs/apply',
    location: 'Philadelphia',
    country: 'US',
    state: 'PA',
    eligibilityRules: 'Applicants must be 18 or older.',
    benefitType: BenefitType.JOB,
    benefitAmount: null,
    deadline: null,
    status: OpportunityStatus.ACTIVE,
    verificationStatus: VerificationStatus.VERIFIED,
    rejectionReason: null,
    confidenceScore: 95,
    freshnessScore: 95,
    datePublished: NOW,
    dateLastVerified: NOW,
    sourceName: 'Employer careers page',
    sourceUrl: 'https://example.org/jobs',
    sourceType: SourceType.EXTERNAL_SOURCE,
    submittedById: '00000000-0000-0000-0000-000000000001',
    createdById: '00000000-0000-0000-0000-000000000001',
    lastUpdatedById: '00000000-0000-0000-0000-000000000001',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  } as OpportunityResponseDto;
}

describe('OpportunityLinkRegistryService', () => {
  const opportunities = { findAll: jest.fn() } as unknown as jest.Mocked<OpportunitiesService>;
  const service = new OpportunityLinkRegistryService(opportunities);

  beforeEach(() => jest.clearAllMocks());

  it('recognizes the exact founder walkthrough action intent', () => {
    expect(isOpportunityActionRequest('show me where to sign up')).toBe(true);
    expect(isOpportunityActionRequest('Can you explain this job?')).toBe(false);
  });

  it('infers member-relevant categories without using commercial economics', () => {
    expect(inferOpportunityCategory('I need a job near me')).toBe(OpportunityCategory.EMPLOYMENT);
    expect(inferOpportunityCategory('my water bill is late')).toBe(OpportunityCategory.FINANCIAL_ASSISTANCE);
  });

  it('uses the member’s most recent need when the conversation changes topics', () => {
    expect(inferOpportunityCategory('I need a job\nActually I need housing help')).toBe(OpportunityCategory.HOUSING);
    expect(inferOpportunityCategory('I need housing help\nActually I need a job')).toBe(OpportunityCategory.EMPLOYMENT);
  });

  it('returns a verified action only from a verified active opportunity', async () => {
    opportunities.findAll.mockResolvedValue({ data: [opportunity()], total: 1, page: 1, limit: 50 });

    const result = await service.findBestAction('I need a job. show me where to sign up');

    expect(result.reason).toBe('VERIFIED');
    expect(result.action).toEqual(expect.objectContaining({
      opportunityId: 'opp-1',
      url: 'https://example.org/jobs/apply',
      canonicalUrl: 'https://example.org/jobs/apply',
      status: 'verified',
      referralUrl: null,
      affiliateDisclosure: null,
    }));
    expect(opportunities.findAll).toHaveBeenCalledWith(expect.objectContaining({
      category: OpportunityCategory.EMPLOYMENT,
      status: OpportunityStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
    }));
  });

  it('fails closed when relevant link verification evidence is missing', async () => {
    opportunities.findAll.mockResolvedValue({
      data: [opportunity({ dateLastVerified: null })], total: 1, page: 1, limit: 50,
    });

    const result = await service.findBestAction('I need a job. show me where to sign up');

    expect(result).toEqual({ action: null, reason: 'UNVERIFIED' });
  });

  it('fails closed when the last verification is older than the repository freshness window', async () => {
    const staleVerification = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    opportunities.findAll.mockResolvedValue({
      data: [opportunity({ dateLastVerified: staleVerification })], total: 1, page: 1, limit: 50,
    });

    const result = await service.findBestAction('I need a job. show me where to sign up');

    expect(result).toEqual({ action: null, reason: 'UNVERIFIED' });
  });

  it('disables non-http destinations even when the opportunity record is otherwise verified', () => {
    const entry = service.toRegistryEntry(opportunity({ applicationUrl: 'javascript:alert(1)' }));
    expect(entry.status).toBe('disabled');
    expect(entry.url).toBe('');
  });

  it('never uses affiliate economics as a ranking signal', async () => {
    const lessFreshButRelevant = opportunity({
      id: 'opp-relevant', title: 'Warehouse Job', freshnessScore: 20, confidenceScore: 70,
    });
    const fresherButLessRelevant = opportunity({
      id: 'opp-generic', title: 'General Employment Listing', shortDescription: 'Open role.', freshnessScore: 100,
      applicationUrl: 'https://example.org/generic',
    });
    opportunities.findAll.mockResolvedValue({
      data: [fresherButLessRelevant, lessFreshButRelevant], total: 2, page: 1, limit: 50,
    });

    const result = await service.findBestAction('I need warehouse work. show me where to sign up');

    expect(result.action?.opportunityId).toBe('opp-relevant');
  });

  it('decorates only the member-first winner after ranking is complete', async () => {
    const selected = opportunity({
      id: 'opp-selected', provider: 'Scrambly', title: 'Warehouse Job', freshnessScore: 20,
    });
    const generic = opportunity({
      id: 'opp-generic', provider: 'BigCashWeb', title: 'General Employment Listing',
      shortDescription: 'Open role.', freshnessScore: 100, applicationUrl: 'https://example.org/generic',
    });
    opportunities.findAll.mockResolvedValue({
      data: [generic, selected], total: 2, page: 1, limit: 50,
    });

    const providerAdapters = {
      decorate: jest.fn((_opportunity, action) => ({
        ...action,
        url: 'https://ref.example/selected',
        referralUrl: 'https://ref.example/selected',
        affiliateDisclosure: 'Disclosure',
      })),
    } as unknown as jest.Mocked<OpportunityProviderAdapterRegistryService>;
    const wiredService = new OpportunityLinkRegistryService(opportunities, providerAdapters);

    const result = await wiredService.findBestAction('I need warehouse work. show me where to sign up');

    expect(result.action?.opportunityId).toBe('opp-selected');
    expect(result.action?.referralUrl).toBe('https://ref.example/selected');
    expect(providerAdapters.decorate).toHaveBeenCalledTimes(1);
    expect(providerAdapters.decorate).toHaveBeenCalledWith(
      selected,
      expect.objectContaining({ opportunityId: 'opp-selected', referralUrl: null }),
    );
  });
});
