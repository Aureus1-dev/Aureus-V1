import { join } from 'path';
import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { V1ScopeMiddleware } from './common/middleware/v1-scope.middleware';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';
import { GuestActivityInterceptor } from './common/interceptors/guest-activity.interceptor';
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
import { CitySheetModule } from './city-sheet/city-sheet.module';
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
import { ConsentModule } from './consent/consent.module';
import { PublicWardModule } from './public-ward/public-ward.module';
import { ResponsibilitiesModule } from './responsibilities/responsibilities.module';
import { PeopleHelpModule } from './people-help/people-help.module';
import { FamilyModule } from './family/family.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '.env'), join(__dirname, '..', '..', '..', '.env')],
      validationOptions: { abortEarly: false },
      validationSchema: envValidationSchema,
    }),
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
              name: 'default',
              ttl: 60_000,
              limit: 100,
            },
          ],
          storage: redisUrl ? new RedisThrottlerStorageService(redisUrl) : undefined,
        };
      },
    }),
    ScheduleModule.forRoot(),
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
    CitySheetModule,
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
    ConsentModule,
    PublicWardModule,
    ResponsibilitiesModule,
    PeopleHelpModule,
    FamilyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: GuestActivityInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware, V1ScopeMiddleware).forRoutes('*');
  }
}
