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
  // Swagger/OpenAPI docs are on by default outside production, off by
  // default in it (main.ts) — this opts back in for a production
  // deployment that wants the schema public anyway.
  ENABLE_API_DOCS: Joi.boolean().default(false),

  // '*' is fine for local dev/CI; in production it disables credentialed
  // CORS silently (see main.ts) rather than the operator ever intending
  // that, so it's rejected outright once NODE_ENV=production.
  CORS_ORIGIN: Joi.string().default('*').when('NODE_ENV', {
    is: 'production',
    then: Joi.string().invalid('*').required().messages({
      'any.invalid': 'CORS_ORIGIN must be an explicit origin allowlist in production, not "*"',
    }),
  }),

  // ── Authentication (OAS-SEC-003) ────────────────────────────────────────
  JWT_ACCESS_SECRET:      Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY:      Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: Joi.number().default(30),

  // ── Email delivery (ADR-009, hardened PD-001) ────────────────────────────
  // TEMPORARY (v1 launch): SMTP_HOST was required once NODE_ENV=production
  // (see git history for the .when('NODE_ENV', ...) rule this replaced).
  // Relaxed to fully optional in every environment so the app can boot and
  // serve traffic before a production SMTP provider is provisioned — a
  // sequencing problem (SMTP setup depending on a domain the deploy itself
  // is meant to prove out first), not a decision that email delivery is
  // unimportant. Absent, NodemailerEmailService falls back to nodemailer's
  // jsonTransport (captures instead of delivering) and logs a startup
  // warning naming exactly which features are affected: email verification,
  // password reset, and the email channel of Communication System
  // notifications — see that warning and docs/operations/production-
  // runbook.md §2 for the full list. None of this touches the security
  // controls those features sit behind (email-verification-required-at-
  // login stays enforced; a user with no way to receive the verification
  // link simply cannot complete it — "unavailable," not "bypassed").
  // Revert by restoring: `.when('NODE_ENV', { is: 'production', then: Joi.required() })`
  // once a production SMTP provider is configured.
  // .empty('') treats an explicitly-empty-string value the same as an
  // absent one — docker-compose.yml's `${SMTP_HOST:-}` substitution sets
  // literally "" rather than omitting the key when the operator hasn't
  // provided a real value.
  // .empty('') below on SMTP_PORT/SMTP_SECURE (and OPENAI_MODEL/
  // ANTHROPIC_MODEL further down) for the same docker-compose.yml
  // `${VAR:-}` empty-string reason as SMTP_HOST above — an unset value
  // must fall through to Joi's own .default(), not fail validation outright.
  SMTP_HOST: Joi.string().empty('').optional(),
  SMTP_PORT:       Joi.number().empty('').default(587),
  SMTP_SECURE:     Joi.boolean().empty('').default(false),
  SMTP_USER:       Joi.string().empty('').optional(),
  SMTP_PASSWORD:   Joi.string().empty('').optional(),
  SMTP_FROM_EMAIL: Joi.string().default('no-reply@aureus.app'),
  FRONTEND_URL:    Joi.string().default('http://localhost:3001'),

  // ── AI Intelligence Engine (ADR-015, hardened PD-001) ────────────────────
  // AI_PROVIDER defaults to 'stub': unset (local dev, CI, this
  // environment) falls back to a deterministic local completion, never
  // an external network call. Once a real provider is selected, its own
  // API key becomes required — previously it stayed optional even then,
  // silently degrading requests to StubAiProvider (or a runtime provider
  // resolution error at request time) rather than failing at boot.
  AI_PROVIDER: Joi.string().valid('openai', 'anthropic', 'stub').default('stub'),
  OPENAI_API_KEY: Joi.string().empty('').when('AI_PROVIDER', { is: 'openai', then: Joi.required() }),
  OPENAI_MODEL:       Joi.string().empty('').default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: Joi.string().empty('').when('AI_PROVIDER', { is: 'anthropic', then: Joi.required() }),
  ANTHROPIC_MODEL:    Joi.string().empty('').default('claude-3-5-haiku-20241022'),

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
  AI_EMERGENCY_STOP:          Joi.boolean().empty('').default(false),
  AI_GLOBAL_DAILY_BUDGET_USD: Joi.number().empty('').default(50),
  AI_USER_DAILY_BUDGET_USD:   Joi.number().empty('').default(2),

  // Voice Domain (ADR-016). Reuses OPENAI_API_KEY above — no separate
  // credential. Optional in every environment: absent, VoiceSessionService
  // falls back to these same literal defaults itself.
  VOICE_MODEL: Joi.string().empty('').default('gpt-4o-realtime-preview'),
  VOICE_NAME:  Joi.string().empty('').default('alloy'),
});
