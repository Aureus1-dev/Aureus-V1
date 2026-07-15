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
import { AdministrationModule } from './administration/administration.module';
import { UserInterestsModule } from './users/interests/user-interests.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Configuration + env validation ─────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        PORT:         Joi.number().default(3000),
        NODE_ENV:     Joi.string().valid('development', 'production', 'test').default('development'),
        CORS_ORIGIN:  Joi.string().default('*'),

        // ── Authentication (OAS-SEC-003) ────────────────────────────────────
        JWT_ACCESS_SECRET:      Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRY:      Joi.string().default('15m'),
        JWT_REFRESH_EXPIRY_DAYS: Joi.number().default(30),

        // ── Email delivery (ADR-009) ─────────────────────────────────────────
        // SMTP_HOST is intentionally optional: unset (local dev, CI) falls back
        // to nodemailer's jsonTransport, which captures rather than delivers.
        SMTP_HOST:       Joi.string().optional(),
        SMTP_PORT:       Joi.number().default(587),
        SMTP_SECURE:     Joi.boolean().default(false),
        SMTP_USER:       Joi.string().optional(),
        SMTP_PASSWORD:   Joi.string().optional(),
        SMTP_FROM_EMAIL: Joi.string().default('no-reply@aureus.app'),
        FRONTEND_URL:    Joi.string().default('http://localhost:3001'),
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
