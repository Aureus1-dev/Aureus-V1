import { Injectable } from '@nestjs/common';
import type { OpportunityActionResponseDto } from '../dto/opportunity-action-response.dto';
import type { OpportunityResponseDto } from '../dto/opportunity-response.dto';

const COMMERCIAL_DESTINATIONS_ENV = 'OPPORTUNITY_COMMERCIAL_DESTINATIONS_JSON';

const AFFILIATE_DISCLOSURE =
  'Aureus may receive compensation if you use this link. This does not affect which opportunity we recommend.';

type CommercialDestinationMap = Record<string, string>;

/**
 * Issue #95 §2 — provider-neutral commercial destination seam.
 *
 * Aureus does not need a commercial relationship in order to help. The
 * Opportunity Link Registry first chooses the member-relevant VERIFIED +
 * ACTIVE Opportunity from canonical data. Only after selection is complete
 * may this adapter replace that exact canonical destination with an approved
 * HTTPS commercial/referral destination and attach disclosure.
 *
 * Configuration is keyed by the exact canonical URL rather than provider name,
 * so the seam works for a bank, employer, benefit partner, future Aureus direct
 * relationship, or any other approved destination without changing Hall or
 * adding provider-specific code. Missing, malformed, mismatched, or unsafe
 * configuration fails closed to the official canonical action.
 */
@Injectable()
export class OpportunityProviderAdapterRegistryService {
  decorate(
    opportunity: OpportunityResponseDto,
    action: OpportunityActionResponseDto,
  ): OpportunityActionResponseDto {
    return applyCommercialDestination(opportunity, action, process.env);
  }
}

export function applyCommercialDestination(
  _opportunity: OpportunityResponseDto,
  action: OpportunityActionResponseDto,
  env: NodeJS.ProcessEnv,
): OpportunityActionResponseDto {
  if (action.status !== 'verified') return action;

  const canonicalUrl = safeHttpsUrl(action.canonicalUrl);
  if (!canonicalUrl) return action;

  const destinations = parseCommercialDestinationMap(env[COMMERCIAL_DESTINATIONS_ENV]);
  const configured = destinations[canonicalUrl];
  const commercialUrl = safeHttpsUrl(configured);
  if (!commercialUrl) return action;

  return {
    ...action,
    url: commercialUrl,
    referralUrl: commercialUrl,
    affiliateDisclosure: AFFILIATE_DISCLOSURE,
  };
}

function parseCommercialDestinationMap(value: string | undefined): CommercialDestinationMap {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const result: CommercialDestinationMap = {};
    for (const [rawCanonical, rawCommercial] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof rawCommercial !== 'string') continue;
      const canonical = safeHttpsUrl(rawCanonical);
      const commercial = safeHttpsUrl(rawCommercial);
      if (!canonical || !commercial) continue;
      result[canonical] = commercial;
    }
    return result;
  } catch {
    return {};
  }
}

function safeHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}
