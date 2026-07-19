import { join } from 'path';
import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';
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
    // Schema lives in ./config/env.validation.ts (PD-002) so the exact same
    // validation an actual boot performs can also run standalone via
    // `src/scripts/verify-env.ts`, ahead of a deploy.
    //
    // envFilePath is explicit (config audit fix): without it, dotenv's
    // default lookup is relative to process.cwd(), which is apps/api when
    // this app's own dev/start script runs (pnpm/turbo run a workspace
    // package's script with that package's directory as cwd) — not the
    // repo root, where the monorepo's single .env actually lives. Left
    // unset, a correctly-configured root .env is silently never read and
    // boot fails with "DATABASE_URL is required" even though the file is
    // right there one directory up. apps/api/.env is checked first (so a
    // per-package override still wins if anyone ever adds one), root .env
    // second. Both entries are skipped silently if absent — production
    // and CI, which set real environment variables directly and have no
    // .env file at all, are unaffected either way.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '.env'), join(__dirname, '..', '..', '..', '.env')],
      validationOptions: { abortEarly: false },
      validationSchema: envValidationSchema,
    }),

    // ── Rate limiting (PD-002: Redis-backed storage when REDIS_URL is set —
    // see RedisThrottlerStorageService for why this matters once there's
    // more than one API replica) ─────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl && config.get<string>('NODE_ENV') === 'production') {
          new Logger('AppModule').warn(
            'REDIS_URL is not set in production — rate limiting will use per-instance in-memory storage. ' +
            'This is only correct for a single API replica; set REDIS_URL once running more than one.',
          );
        }
        return {
          throttlers: [
            {
              name:  'default',
              ttl:   60_000,  // 1-minute window
              limit: 100,     // 100 requests per window per IP
            },
          ],
          storage: redisUrl ? new RedisThrottlerStorageService(redisUrl) : undefined,
        };
      },
    }),

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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Structured per-request access log (PD-002) — every route, including
    // health checks, so a slow/failing instance is diagnosable from logs
    // alone.
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
