import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { AuthGuardsModule } from './auth-guards.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { AUTH_REPOSITORY } from './repositories/auth.repository.interface';

@Module({
  imports: [
    UsersModule,
    AuthGuardsModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        // @nestjs/jwt's StringValue type only accepts literal template strings; the
        // env value is validated at runtime by the Joi schema in AppModule instead.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '15m') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_REPOSITORY, useClass: PrismaAuthRepository },
  ],
})
export class AuthModule {}
