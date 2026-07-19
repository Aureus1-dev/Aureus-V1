import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Wraps PrismaClient with the pg driver adapter required by Prisma 7.
 * Exposes the client via `.db` for repository injection.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly client: PrismaClient;

  constructor() {
    // Pool size (PD-002): defaults (max 10, min 0) match the `pg` driver's
    // own defaults, so an operator who never sets these env vars sees
    // identical behavior to before this option existed. Production hosts
    // fronted by a managed pooler (RDS Proxy, PgBouncer) should size this
    // well below the pooler's own connection ceiling — see
    // docs/operations/production-runbook.md for guidance.
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX) || 10,
      min: Number(process.env.DATABASE_POOL_MIN) || 0,
    });
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
  }

  /** Typed access to the Prisma query client. */
  get db(): PrismaClient {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
    this.logger.log('Database disconnected');
  }
}
