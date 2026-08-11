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
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  // Swagger/OpenAPI docs are on by default outside production, off by
  // default in it (main.ts) — this opts back in for a production
  // deployment that wants the schema public anyway.
  ENABLE_API_DOCS: Joi.boolean().default(false),

  // '*' is fine for local dev/CI; in production it disables credentialed
  // CORS silently (see main.ts) rather than the operator ever intending
  // that, so it's rejected outright once NODE_ENV=production.
  CORS_ORIGIN: Joi.string()
    .default('*')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('*').required().messages({
        'any.invalid': 'CORS_ORIGIN must be an explicit origin allowlist in production, not "*"',
      }),
    }),

  // ── Authentication (OAS-SEC-003) ────────────────────────────────────────
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: Joi.number().default(30),

  // ── Guest Steward mode privacy lifecycle ─────────────────────────────
  // How long an abandoned guest account (no email/password ever added)
  // may go without any activity before it, and everything it created —
  // conversations, stated needs, goals — is permanently deleted, not
  // merely soft-deleted. "Creating a free account is only to preserve
  // progress" is the stated principle; a guest who never claims one
  // should not have their story kept indefinitely by default. Well
  // under JWT_REFRESH_EXPIRY_DAYS above, so a guest's data is gone
  // before their own browser-held token would have expired anyway.
  GUEST_SESSION_RETENTION_DAYS: Joi.number().default(7),

  // ── Email delivery (ADR-009, hardened PD-001) ────────────────────────────
  // SMTP is a production launch requirement because login enforces email
  // verification and password recovery is delivered by email. Without a
  // real transport, a new member cannot complete the normal account
  // lifecycle. Development/test retain the local jsonTransport fallback.
  // .empty('') treats an explicitly-empty-string value the same as an
  // absent one — docker-compose.yml's `${SMTP_HOST:-}` substitution sets
  // literally "" rather than omitting the key when the operator hasn't
  // provided a real value.
  // .empty('') below on SMTP_PORT/SMTP_SECURE (and OPENAI_MODEL/
  // ANTHROPIC_MODEL further down) for the same docker-compose.yml
  // `${VAR:-}` empty-string reason as SMTP_HOST above — an unset value
  // must fall through to Joi's own .default(), not fail validation outright.
  SMTP_HOST: Joi.string().empty('').when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().empty('').default(587),
  SMTP_SECURE: Joi.boolean().empty('').default(false),
  SMTP_USER: Joi.string().empty('').optional(),
  SMTP_PASSWORD: Joi.string().empty('').optional(),
  SMTP_FROM_EMAIL: Joi.string().default('no-reply@aureus.app'),
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),

  // ── AI Intelligence Engine (ADR-015, hardened PD-001) ────────────────────
  // AI_PROVIDER defaults to 'stub': unset (local dev, CI, this
  // environment) falls back to a deterministic local completion, never
  // an external network call. Once a real provider is selected, its own
  // API key becomes required — previously it stayed optional even then,
  // silently degrading requests to StubAiProvider (or a runtime provider
  // resolution error at request time) rather than failing at boot.
  // 'stub' is rejected once NODE_ENV=production: StubAiProvider returns a
  // literal "[stub AI response] Acknowledged: ..." string, and with the
  // Steward's replies rendered straight into arrival, a misconfigured
  // production deploy would show a member in crisis that placeholder text
  // where an answer should be. Failing at boot is the only way that is
  // caught before a person reads it. Mirrors the CORS_ORIGIN rule above.
  AI_PROVIDER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('openai', 'anthropic').required().messages({
      'any.only':
        'AI_PROVIDER must be a real provider ("openai" or "anthropic") in production — the stub provider returns placeholder text that members would see.',
    }),
    otherwise: Joi.string().valid('openai', 'anthropic', 'stub').default('stub'),
  }),
  OPENAI_API_KEY: Joi.string()
    .empty('')
    .when('AI_PROVIDER', { is: 'openai', then: Joi.required() })
    .when('VOICE_PROVIDER', { is: 'openai', then: Joi.required() }),
  OPENAI_MODEL: Joi.string().empty('').default('gpt-5-mini'),
  ANTHROPIC_API_KEY: Joi.string()
    .empty('')
    .when('AI_PROVIDER', { is: 'anthropic', then: Joi.required() }),
  ANTHROPIC_MODEL: Joi.string().empty('').default('claude-3-5-haiku-20241022'),

  // ── Infrastructure (PD-002) ──────────────────────────────────────────────
  // Optional in every environment: absent, rate limiting falls back to
  // in-memory storage, which is correct for a single instance and only
  // becomes wrong once there's more than one API replica (see
  // RedisThrottlerStorageService for why). Not made production-required
  // like SMTP/CORS above because a single-instance production
  // deployment is still a legitimate, fully-correct configuration
  // without it — main.ts logs a one-time warning instead of failing
  // boot, since this is a scaling concern, not a broken-on-its-own one.
  REDIS_URL: Joi.string().empty('').optional(),
  // Prisma's pg Pool — defaults match the `pg` driver's own defaults
  // (max 10) so an operator who never sets these sees identical
  // behavior to before this option existed.
  DATABASE_POOL_MAX: Joi.number().empty('').default(10),
  DATABASE_POOL_MIN: Joi.number().empty('').default(0),

  // Error tracking (Production Stability). Optional in every environment —
  // absent, AllExceptionsFilter still logs every 5xx to stdout as before,
  // it just never leaves the process. Not made production-required like
  // SMTP/CORS above: a production deploy without Sentry configured is a
  // legitimate (if less observable) choice, not a broken one.
  SENTRY_DSN: Joi.string().empty('').optional(),

  // AI spend controls (PR-002/PR-003, Production Environment Variable
  // Audit). These three only ever seed AiOperationalConfig's singleton DB
  // row on first read — see AiOperationalConfigService for why — so a
  // missing/malformed value here is not boot-fatal in the way OPENAI_API_KEY
  // is. Added to this schema anyway so a typo (e.g. AI_GLOBAL_DAILY_BUDGET_USD
  // set to a non-numeric string) fails loudly at boot instead of silently
  // falling through to ConfigService's own default.
  AI_EMERGENCY_STOP: Joi.boolean().empty('').default(false),
  AI_GLOBAL_DAILY_BUDGET_USD: Joi.number().empty('').default(50),
  AI_USER_DAILY_BUDGET_USD: Joi.number().empty('').default(2),

  // Voice is an explicitly selected provider, never inferred from whether a
  // key happens to exist. Production rejects the stub and requires the key
  // matching the selected provider, preventing a voice UI that can only fail
  // after microphone permission has been granted.
  VOICE_PROVIDER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('openai', 'gemini').required(),
    otherwise: Joi.string().valid('openai', 'gemini', 'stub').default('stub'),
  }),
  GEMINI_API_KEY: Joi.string()
    .empty('')
    .when('VOICE_PROVIDER', { is: 'gemini', then: Joi.required() }),
  // When omitted, each provider supplies its own current safe default.
  VOICE_MODEL: Joi.string().empty('').optional(),
  VOICE_NAME: Joi.string().empty('').optional(),
});
