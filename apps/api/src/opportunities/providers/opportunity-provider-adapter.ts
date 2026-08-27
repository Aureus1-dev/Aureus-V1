import { Injectable } from '@nestjs/common';
import type { OpportunityActionResponseDto } from '../dto/opportunity-action-response.dto';
import type { OpportunityResponseDto } from '../dto/opportunity-response.dto';

export type TemporaryOpportunityProviderKey = 'scrambly' | 'bigcashweb' | 'swagbucks';

interface TemporaryProviderConfig {
  key: TemporaryOpportunityProviderKey;
  providerAliases: readonly string[];
  referralUrlEnv: 'SCRAMBLY_REFERRAL_URL' | 'BIGCASHWEB_REFERRAL_URL' | 'SWAGBUCKS_REFERRAL_URL';
}

export interface OpportunityProviderAdapter {
  readonly key: TemporaryOpportunityProviderKey;
  readonly railKind: 'temporary';
  matches(opportunity: OpportunityResponseDto): boolean;
  decorate(action: OpportunityActionResponseDto): OpportunityActionResponseDto;
}

const AFFILIATE_DISCLOSURE =
  'Aureus may receive compensation if you use this referral link. This does not affect which opportunity we recommend.';

const TEMPORARY_PROVIDER_CONFIGS: readonly TemporaryProviderConfig[] = [
  {
    key: 'scrambly',
    providerAliases: ['scrambly'],
    referralUrlEnv: 'SCRAMBLY_REFERRAL_URL',
  },
  {
    key: 'bigcashweb',
    providerAliases: ['bigcashweb', 'big cash web'],
    referralUrlEnv: 'BIGCASHWEB_REFERRAL_URL',
  },
  {
    key: 'swagbucks',
    providerAliases: ['swagbucks', 'swag bucks'],
    referralUrlEnv: 'SWAGBUCKS_REFERRAL_URL',
  },
];

/**
 * Issue #95 §2 — temporary Opportunity Center rails.
 *
 * These adapters are intentionally post-selection decorators. The Opportunity
 * Link Registry first chooses the member-relevant VERIFIED + ACTIVE
 * Opportunity using canonical opportunity data only. Only after that choice is
 * complete may a matching adapter substitute a configured referral
 * destination and attach disclosure. Referral economics therefore cannot
 * improve rank or make an otherwise unsafe/stale opportunity actionable.
 *
 * This seam is deliberately replaceable: a future Aureus-owned/direct
 * relationship can implement the same adapter contract without changing Hall
 * response DTOs or member UX.
 */
@Injectable()
export class OpportunityProviderAdapterRegistryService {
  decorate(
    opportunity: OpportunityResponseDto,
    action: OpportunityActionResponseDto,
  ): OpportunityActionResponseDto {
    return applyTemporaryProviderRail(opportunity, action, process.env);
  }
}

export function applyTemporaryProviderRail(
  opportunity: OpportunityResponseDto,
  action: OpportunityActionResponseDto,
  env: NodeJS.ProcessEnv,
): OpportunityActionResponseDto {
  if (action.status !== 'verified') return action;

  const adapters = TEMPORARY_PROVIDER_CONFIGS.map(
    (config) => new EnvironmentReferralProviderAdapter(config, env),
  );
  const adapter = adapters.find((candidate) => candidate.matches(opportunity));

  return adapter ? adapter.decorate(action) : action;
}

class EnvironmentReferralProviderAdapter implements OpportunityProviderAdapter {
  readonly railKind = 'temporary' as const;

  constructor(
    private readonly config: TemporaryProviderConfig,
    private readonly env: NodeJS.ProcessEnv,
  ) {}

  get key(): TemporaryOpportunityProviderKey {
    return this.config.key;
  }

  matches(opportunity: OpportunityResponseDto): boolean {
    const provider = normalizeProvider(opportunity.provider);
    return this.config.providerAliases.some((alias) => normalizeProvider(alias) === provider);
  }

  decorate(action: OpportunityActionResponseDto): OpportunityActionResponseDto {
    const referralUrl = safeHttpsUrl(this.env[this.config.referralUrlEnv]);
    if (!referralUrl) return action;

    return {
      ...action,
      url: referralUrl,
      referralUrl,
      affiliateDisclosure: AFFILIATE_DISCLOSURE,
    };
  }
}

function normalizeProvider(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
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
