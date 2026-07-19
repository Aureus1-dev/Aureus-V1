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
  // SMTP_HOST is optional in development/test (local dev, CI) — it falls
  // back to nodemailer's jsonTransport, which captures rather than
  // delivers. In production it is required: without it, password reset
  // and email verification would silently no-op instead of failing.
  // .empty('') treats an explicitly-empty-string value the same as an
  // absent one — docker-compose.yml's `${SMTP_HOST:-}` substitution
  // sets literally "" rather than omitting the key when the operator
  // hasn't provided a real value, so without this an unset SMTP_HOST
  // would fail with a confusing "not allowed to be empty" instead of
  // the intended "required in production" message.
  // .empty('') below on SMTP_PORT/SMTP_SECURE (and OPENAI_MODEL/
  // ANTHROPIC_MODEL further down) for the same docker-compose.yml
  // `${VAR:-}` empty-string reason as SMTP_HOST above — these are also
  // passed that way even though they're not production-required, so an
  // unset host var must still fall through to Joi's own .default(),
  // not fail validation outright.
  SMTP_HOST: Joi.string().empty('').when('NODE_ENV', { is: 'production', then: Joi.required() }),
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
});
