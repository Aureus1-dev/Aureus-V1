import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  // Kept as an alias of /health/ready (PD-002) — existing Docker
  // HEALTHCHECK/monitoring configured against plain /health before the
  // liveness/readiness split keeps working unchanged.
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check (alias of /health/ready) — includes database connectivity' })
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }

  // Liveness (PD-002): "is the process up and able to respond at all" —
  // deliberately checks no external dependency, so a slow/unreachable
  // database doesn't cause an orchestrator to kill and restart a
  // perfectly-running process (that's what readiness is for).
  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe — process is up; no external dependency checks' })
  live() {
    return this.health.check([]);
  }

  // Readiness (PD-002): "can this instance actually serve traffic right
  // now" — checks the database, the one dependency every request path
  // needs. Suitable for a load balancer / k8s readiness probe deciding
  // whether to route traffic to this instance.
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — database connectivity required to serve traffic' })
  ready() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }
}
