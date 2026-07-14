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
