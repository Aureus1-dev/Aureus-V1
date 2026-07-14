import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.db.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch {
      const result = this.getStatus(key, false, { message: 'Database unreachable' });
      throw new HealthCheckError('Database health check failed', result);
    }
  }
}
