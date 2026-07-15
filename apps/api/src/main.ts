import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // Environment-aware log levels
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);

  // ── HTTP security headers ─────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigin = config.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: corsOrigin,
    credentials: corsOrigin !== '*',
  });

  // ── Global exception filter ───────────────────────────────────────────────
  // Catches all exceptions: maps Prisma codes → HTTP status, logs consistently.
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Request validation ────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: true, // 400 for unknown properties
      transform: true,           // auto-coerce types (e.g. query string → number)
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Aureus API')
    .setDescription('Aureus V1 Platform — REST API')
    .setVersion('1.0')
    .addTag('auth',           'Authentication and identity endpoints')
    .addTag('users',          'User management endpoints')
    .addTag('resources',      'Resource Directory endpoints')
    .addTag('organizations',  'Business Portal endpoints (organization profiles and membership)')
    .addTag('stewardship',    'Stewardship System endpoints (relationships, notes, tasks, recommendations, escalations, metrics)')
    .addTag('communication',  'Communication System endpoints (notifications, preferences, announcements, messaging)')
    .addTag('administration', 'Administration & Operations endpoints (role management)')
    .addTag('health',         'Liveness and readiness endpoints')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Listens for SIGTERM/SIGINT and cleanly closes DB connections via
  // PrismaService.onModuleDestroy before the process exits.
  app.enableShutdownHooks();

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
  logger.log(`Swagger docs:  http://localhost:${port}/api/docs`);
  logger.log(`Health check:  http://localhost:${port}/health`);
}

bootstrap().catch((err: Error) => {
  // Fatal startup error — log and exit with non-zero code so the
  // container orchestrator knows the pod failed to start.
  console.error('Fatal bootstrap error:', err.message);
  process.exit(1);
});
