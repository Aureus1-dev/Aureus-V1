import * as Joi from 'joi';

/**
 * Shared Joi schema for process.env (PD-002). Extracted from app.module.ts
 * so the exact same validation an actual boot performs can also run
 * standalone, ahead of a deploy, via `src/scripts/verify-env.ts` — an
 * operator can check a candidate .env/environment before cutting traffic
 * to it, not just discover a misconfiguration when the container crash-
 * loops.
 *
 * A handful of vars that are safely optional in development/test become
 * REQUIRED once NODE_ENV=production, via Joi.when() cross-field rules
 * below — so a misconfigured production deploy fails loudly at boot
 * instead of silently degrading (e.g. email silently going nowhere, or
 * CORS silently staying wide open).
 */
export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  PORT:         Joi.number().default(3000),
  NODE_ENV:     Joi.string().valid('development', 'production', 'test').default('development'),
  ENABLE_API_DOCS: Joi.boolean().default(false),

  CORS_ORIGIN: Joi.string().default('*').when('NODE_ENV', {
    is: 'production',
    then: Joi.string().invalid('*').required().messages({
      'any.invalid': 'CORS_ORIGIN must be an explicit origin allowlist in production, not "*"',
    }),
  }),

  // ── Authentication (OAS-SEC-003) ────────────────────────────────────────
  JWT_ACCESS_SECRET:       Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY:       Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: Joi.number().default(30),
  GUEST_SESSION_RETENTION_DAYS: Joi.number().default(7),

  // ── Email delivery (ADR-009, hardened PD-001) ────────────────────────────
  // Production authentication requires working verification/password-recovery
  // email. An app that accepts registration but cannot deliver the next step
  // is a false-capability state, so production fails closed here.
  SMTP_HOST: Joi.string().empty('').when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_VERIFY_ON_STARTUP: Joi.boolean().empty('').default(true),
  SMTP_PORT:       Joi.number().empty('').default(587),
  SMTP_SECURE:     Joi.boolean().empty('').default(false),
  SMTP_USER:       Joi.string().empty('').optional(),
  SMTP_PASSWORD:   Joi.string().empty('').optional(),
  SMTP_FROM_EMAIL: Joi.string().default('no-reply@aureus.app'),
  FRONTEND_URL:    Joi.string().default('http://localhost:3001'),

  // ── AI Intelligence Engine (ADR-015, hardened PD-001) ────────────────────
  AI_PROVIDER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('openai', 'anthropic').required().messages({
      'any.only':
        'AI_PROVIDER must be a real provider ("openai" or "anthropic") in production — the stub provider returns placeholder text that members would see.',
    }),
    otherwise: Joi.string().valid('openai', 'anthropic', 'stub').default('stub'),
  }),

  // Voice is currently a launch-enabled V1 feature on both API and web.
  // Realtime voice has no Anthropic fallback: VoiceProviderModule uses OpenAI
  // whenever this key is present and otherwise produces a local stub secret.
  // The browser necessarily sends that ephemeral secret to OpenAI Realtime.
  // Therefore a production deployment without OPENAI_API_KEY would advertise
  // a working Talk path, broker a fake secret, and fail only after the member
  // grants microphone access. Fail at boot instead. If voice is deliberately
  // removed from launch later, this production requirement should be changed
  // together with both V1 feature-scope flags rather than silently diverging.
  OPENAI_API_KEY: Joi.string()
    .empty('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'OPENAI_API_KEY is required in production while V1 voice is enabled.',
        'string.empty': 'OPENAI_API_KEY is required in production while V1 voice is enabled.',
      }),
      otherwise: Joi.optional(),
    }),
  OPENAI_MODEL:       Joi.string().empty('').default('gpt-5-mini'),
  ANTHROPIC_API_KEY: Joi.string().empty('').when('AI_PROVIDER', { is: 'anthropic', then: Joi.required() }),
  ANTHROPIC_MODEL:    Joi.string().empty('').default('claude-3-5-haiku-20241022'),

  // ── Infrastructure (PD-002) ──────────────────────────────────────────────
  REDIS_URL: Joi.string().empty('').optional(),
  DATABASE_POOL_MAX: Joi.number().empty('').default(10),
  DATABASE_POOL_MIN: Joi.number().empty('').default(0),
  SENTRY_DSN: Joi.string().empty('').optional(),

  // AI spend controls.
  AI_EMERGENCY_STOP:          Joi.boolean().empty('').default(false),
  AI_GLOBAL_DAILY_BUDGET_USD: Joi.number().empty('').default(50),
  AI_USER_DAILY_BUDGET_USD:   Joi.number().empty('').default(2),

  // AI Provider Resilience (PD-009). Read directly by OpenAiProvider/
  // AnthropicProvider on every call (not DB-seeded like the spend controls
  // above), but still not boot-fatal if absent — each provider falls back
  // to the same literal defaults itself. Present here so a typo fails
  // loudly at boot rather than silently.
  AI_PROVIDER_TIMEOUT_MS:                 Joi.number().empty('').default(30_000),
  AI_PROVIDER_MAX_ATTEMPTS:               Joi.number().empty('').default(3),
  AI_PROVIDER_RETRY_BASE_DELAY_MS:        Joi.number().empty('').default(500),
  AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD:   Joi.number().empty('').default(3),
  AI_CIRCUIT_BREAKER_COOLDOWN_MS:         Joi.number().empty('').default(30_000),


  // Voice Domain (ADR-016). Reuses OPENAI_API_KEY above.
  VOICE_MODEL: Joi.string().empty('').default('gpt-realtime'),
  VOICE_NAME:  Joi.string().empty('').default('marin'),
});
