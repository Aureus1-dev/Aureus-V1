import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { initSentry } from './common/monitoring/sentry';

// Before anything else so Sentry.captureException (main.ts, all-exceptions
// filter) works from the very first line — including a fatal bootstrap
// failure below, not just request-time errors.
initSentry();

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    // Structured JSON logging in production (PD-002) — one parseable
    // object per line for a container platform's log aggregator, instead
    // of ANSI-colored text meant for a human terminal.
    logger: new ConsoleLogger({
      json: isProduction,
      colors: !isProduction,
      logLevels: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
    }),
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
  // Off by default in production (PD-001) — a full schema dump of every
  // endpoint/DTO is reconnaissance value an attacker shouldn't get for free.
  // ENABLE_API_DOCS=true opts back in for a deployment that wants it public.
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const swaggerEnabled = nodeEnv !== 'production' || config.get<boolean>('ENABLE_API_DOCS', false);

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Aureus API')
      .setDescription('Aureus V1 Platform — REST API')
      .setVersion('1.0')
      .addTag('auth',           'Authentication and identity endpoints')
      .addTag('users',          'User management endpoints')
      .addTag('resources',      'Resource Directory endpoints')
      .addTag('city-sheet',     'Launch City Sheet endpoints (verified crisis/assistance referrals for the launch metro — Steward/Founder only)')
      .addTag('organizations',  'Business Portal endpoints (organization profiles and membership)')
      .addTag('stewardship',    'Stewardship System endpoints (relationships, notes, tasks, recommendations, escalations, metrics)')
      .addTag('communication',  'Communication System endpoints (notifications, preferences, announcements, messaging)')
      .addTag('knowledge',      'Knowledge System endpoints (verified articles, categorization, revision history)')
      .addTag('academy',        'Academy endpoints (courses, learning paths, enrollments, certifications, Steward Content Studio media)')
      .addTag('pods',           'Pods endpoints (community, membership, events, meeting schedule, service projects, requests, invitations, metrics, escalations, messaging)')
      .addTag('ai',              'AI Intelligence Engine endpoints (conversations, explanations, guidance, recommendations, request history)')
      .addTag('connected-experiences', 'Connected Experiences endpoints (connected accounts, documents, Steward activity audit trail)')
      .addTag('administration', 'Administration & Operations endpoints (role management)')
      .addTag('health',         'Liveness and readiness endpoints')
      .addTag('consent',        'Arrival consent endpoints (Gate B — B3: consent and expectations captured)')
      .addTag('needs',          'Stated need endpoints (Gate C — C1: Understanding)')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Listens for SIGTERM/SIGINT and cleanly closes DB connections via
  // PrismaService.onModuleDestroy before the process exits.
  app.enableShutdownHooks();

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs:  http://localhost:${port}/api/docs`);
  }
  logger.log(`Health check:  http://localhost:${port}/health`);
}

bootstrap().catch((err: Error) => {
  // Fatal startup error — log and exit with non-zero code so the
  // container orchestrator knows the pod failed to start. Sentry.close()
  // flushes the captured event before exiting (and resolves immediately,
  // a no-op, when SENTRY_DSN is unset) — without it, process.exit() below
  // could race the event off the wire before it's ever sent.
  console.error('Fatal bootstrap error:', err.message);
  Sentry.captureException(err);
  Sentry.close(2000).finally(() => process.exit(1));
});
