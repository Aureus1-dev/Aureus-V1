import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './users/profile/profile.module';
import { GoalsModule } from './goals/goals.module';
import { JourneysModule } from './journeys/journeys.module';
import { MilestonesModule } from './milestones/milestones.module';
import { TasksModule } from './tasks/tasks.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ResourcesModule } from './resources/resources.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { StewardshipModule } from './stewardship/stewardship.module';
import { CommunicationModule } from './communication/communication.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AcademyModule } from './academy/academy.module';
import { PodsModule } from './pods/pods.module';
import { AiModule } from './ai/ai.module';
import { ConnectedExperiencesModule } from './connected-experiences/connected-experiences.module';
import { AdministrationModule } from './administration/administration.module';
import { UserInterestsModule } from './users/interests/user-interests.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Configuration + env validation ─────────────────────────────────────
    // PD-001 (Production Foundation): a handful of vars that are safely
    // optional in development/test become REQUIRED once NODE_ENV=production,
    // via Joi.when() cross-field rules below — so a misconfigured production
    // deploy fails loudly at boot instead of silently degrading (e.g. email
    // silently going nowhere, or CORS silently staying wide open).
    ConfigModule.forRoot({
      isGlobal: true,
      validationOptions: { abortEarly: false },
      validationSchema: Joi.object({
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

        // ── Authentication (OAS-SEC-003) ────────────────────────────────────
        JWT_ACCESS_SECRET:      Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRY:      Joi.string().default('15m'),
        JWT_REFRESH_EXPIRY_DAYS: Joi.number().default(30),

        // ── Email delivery (ADR-009, hardened PD-001) ────────────────────────
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

        // ── AI Intelligence Engine (ADR-015, hardened PD-001) ────────────────
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
      }),
    }),

    // ── Rate limiting ───────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name:  'default',
        ttl:   60_000,  // 1-minute window
        limit: 100,     // 100 requests per window per IP
      },
    ]),

    // ── Domain modules ──────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    GoalsModule,
    JourneysModule,
    MilestonesModule,
    TasksModule,
    OpportunitiesModule,
    ResourcesModule,
    OrganizationsModule,
    StewardshipModule,
    CommunicationModule,
    KnowledgeModule,
    AcademyModule,
    PodsModule,
    AiModule,
    ConnectedExperiencesModule,
    AdministrationModule,
    UserInterestsModule,
    HealthModule,
  ],

  providers: [
    // Apply ThrottlerGuard globally to all routes
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
