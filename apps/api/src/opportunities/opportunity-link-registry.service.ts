import { Injectable } from '@nestjs/common';
import { OpportunityCategory, OpportunityStatus, VerificationStatus } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';
import { OpportunityResponseDto } from './dto/opportunity-response.dto';
import { OpportunityActionResponseDto, OpportunityLinkStatus } from './dto/opportunity-action-response.dto';

export type OpportunityActionResolutionReason = 'VERIFIED' | 'NO_MATCH' | 'UNVERIFIED';

export interface OpportunityActionResolution {
  action: OpportunityActionResponseDto | null;
  reason: OpportunityActionResolutionReason;
}

const ACTION_INTENT = /\b(show\s+me\s+where|where\s+(?:can|do|should)\s+i|send\s+me\s+(?:the\s+)?link|give\s+me\s+(?:the\s+)?link|link\s+me|sign\s*up|apply\s+(?:here|now|for)|where\s+to\s+(?:apply|sign\s*up)|take\s+me\s+there)\b/i;

const MAX_VERIFICATION_AGE_DAYS = 365;
const MAX_VERIFICATION_AGE_MS = MAX_VERIFICATION_AGE_DAYS * 24 * 60 * 60 * 1000;

const CATEGORY_RULES: readonly [RegExp, OpportunityCategory][] = [
  [/\b(scholarship|scholarships)\b/i, OpportunityCategory.SCHOLARSHIP],
  [/\b(grant|grants)\b/i, OpportunityCategory.GRANT],
  [/\b(job|jobs|work|employment|hiring|career)\b/i, OpportunityCategory.EMPLOYMENT],
  [/\b(housing|rent|eviction|evicted|apartment|shelter)\b/i, OpportunityCategory.HOUSING],
  [/\b(snap|medicaid|medicare|ssi|ssdi|tanf|government\s+benefit|public\s+benefit|benefits)\b/i, OpportunityCategory.GOVERNMENT_BENEFIT],
  [/\b(water\s+bill|electric\s+bill|gas\s+bill|utility|utilities|financial\s+assistance|bill\s+help)\b/i, OpportunityCategory.FINANCIAL_ASSISTANCE],
  [/\b(credit|credit\s+score|credit\s+building)\b/i, OpportunityCategory.CREDIT_BUILDING],
  [/\b(bank|banking|checking\s+account|savings\s+account)\b/i, OpportunityCategory.BANKING_INCENTIVE],
  [/\b(business|entrepreneur|startup|start\s+a\s+business)\b/i, OpportunityCategory.BUSINESS],
  [/\b(volunteer|volunteering)\b/i, OpportunityCategory.VOLUNTEER],
  [/\b(community\s+program|community\s+support)\b/i, OpportunityCategory.COMMUNITY_PROGRAM],
  [/\b(health|healthcare|medical|wellness|therapy)\b/i, OpportunityCategory.HEALTH_WELLNESS],
  [/\b(college|school|education|training|class|course)\b/i, OpportunityCategory.EDUCATION],
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'for', 'give', 'here', 'i', 'in', 'is', 'it', 'link', 'me',
  'my', 'now', 'of', 'on', 'please', 'show', 'sign', 'the', 'there', 'to', 'up', 'where', 'with', 'you',
]);

export function isOpportunityActionRequest(content: string): boolean {
  return ACTION_INTENT.test(content);
}

export function inferOpportunityCategory(context: string): OpportunityCategory | undefined {
  // Context arrives as newline-delimited USER turns. Start with the latest
  // turn so a member who changes direction (job -> housing, for example)
  // is never routed back to an older need merely because its category rule
  // appears earlier in this file.
  const turns = context.split(/\n+/).map((turn) => turn.trim()).filter(Boolean).reverse();
  for (const turn of turns) {
    const match = CATEGORY_RULES.find(([pattern]) => pattern.test(turn));
    if (match) return match[1];
  }
  return undefined;
}

/**
 * Opportunity Link Registry — a governed view over the existing Opportunity
 * domain, not a second opportunity/link database. Provider, canonical URL,
 * eligibility/geography, verification time and provenance already live on
 * Opportunity. Commercial metadata is explicit and nullable until a governed
 * provider adapter supplies it in a later work order.
 *
 * Critically, this service never accepts a URL from the model. It selects only
 * existing VERIFIED + ACTIVE Opportunity records, derives the URL from their
 * stored application/official-source fields, and fails closed when the URL or
 * verification evidence is not current enough to surface as an action.
 */
@Injectable()
export class OpportunityLinkRegistryService {
  constructor(private readonly opportunities: OpportunitiesService) {}

  async findBestAction(context: string): Promise<OpportunityActionResolution> {
    const category = inferOpportunityCategory(context);
    const result = await this.opportunities.findAll({
      page: 1,
      limit: 50,
      ...(category ? { category } : {}),
      status: OpportunityStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      sortBy: 'freshness',
      sortOrder: 'desc',
    });

    if (result.data.length === 0) {
      return { action: null, reason: 'NO_MATCH' };
    }

    const tokens = meaningfulTokens(context);
    const ranked = result.data
      .map((opportunity) => ({ opportunity, score: relevanceScore(opportunity, tokens, category) }))
      .filter(({ score }) => category !== undefined || score > 0)
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      return { action: null, reason: 'NO_MATCH' };
    }

    for (const { opportunity } of ranked) {
      const action = this.toRegistryEntry(opportunity);
      if (action.status === 'verified') {
        return { action, reason: 'VERIFIED' };
      }
    }

    return { action: null, reason: 'UNVERIFIED' };
  }

  toRegistryEntry(opportunity: OpportunityResponseDto): OpportunityActionResponseDto {
    const canonicalUrl = opportunity.applicationUrl ?? opportunity.officialSourceUrl;
    const safeCanonicalUrl = safeHttpUrl(canonicalUrl);
    const status = this.linkStatus(opportunity, safeCanonicalUrl !== null);

    return {
      opportunityId: opportunity.id,
      opportunityRef: opportunity.opportunityRef,
      title: opportunity.title,
      provider: opportunity.provider,
      url: safeCanonicalUrl ?? '',
      canonicalUrl: safeCanonicalUrl ?? '',
      // Commercial routing is deliberately absent until the governed provider
      // rails work supplies a reviewed value. It therefore cannot influence
      // ranking or silently replace the canonical destination today.
      referralUrl: null,
      affiliateDisclosure: null,
      eligibility: opportunity.eligibilityRules,
      geography: geographyFor(opportunity),
      payoutNotes: null,
      timeToCashNotes: null,
      status,
      lastVerifiedAt: opportunity.dateLastVerified,
      sourceName: opportunity.sourceName,
      sourceUrl: opportunity.sourceUrl,
      sourceType: opportunity.sourceType,
    };
  }

  private linkStatus(opportunity: OpportunityResponseDto, hasSafeUrl: boolean): OpportunityLinkStatus {
    if (
      opportunity.status !== OpportunityStatus.ACTIVE
      || opportunity.verificationStatus !== VerificationStatus.VERIFIED
      || !hasSafeUrl
    ) {
      return 'disabled';
    }

    if (!opportunity.dateLastVerified) {
      return 'stale';
    }

    // Mirror the existing Opportunity freshness policy's zero point: after
    // 365 days without re-verification, a stored VERIFIED flag is no longer
    // sufficient to surface an external action.
    if (Date.now() - opportunity.dateLastVerified.getTime() >= MAX_VERIFICATION_AGE_MS) {
      return 'stale';
    }

    if (opportunity.deadline && opportunity.deadline.getTime() < Date.now()) {
      return 'stale';
    }

    return 'verified';
  }
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function geographyFor(opportunity: OpportunityResponseDto): string | null {
  const values = [opportunity.location, opportunity.state, opportunity.country]
    .filter((value): value is string => Boolean(value?.trim()));
  return values.length ? [...new Set(values)].join(', ') : null;
}

function meaningfulTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function relevanceScore(
  opportunity: OpportunityResponseDto,
  contextTokens: Set<string>,
  inferredCategory?: OpportunityCategory,
): number {
  // Member relevance only. No referral/affiliate/payout field exists in this
  // score path, so commercial economics cannot improve ranking.
  let score = inferredCategory && opportunity.category === inferredCategory ? 100 : 0;
  const candidateText = [
    opportunity.title,
    opportunity.shortDescription,
    opportunity.provider,
    opportunity.eligibilityRules,
    ...opportunity.tags,
  ].join(' ').toLowerCase();

  for (const token of contextTokens) {
    if (candidateText.includes(token)) score += 10;
  }

  score += Math.max(0, opportunity.freshnessScore) / 100;
  score += Math.max(0, opportunity.confidenceScore) / 200;
  return score;
}
