import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';

describe('HealthController (PD-002)', () => {
  let controller: HealthController;
  let health: jest.Mocked<HealthCheckService>;
  let prismaHealth: jest.Mocked<PrismaHealthIndicator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: PrismaHealthIndicator, useValue: { isHealthy: jest.fn() } },
      ],
    }).compile();

    controller = module.get(HealthController);
    health = module.get(HealthCheckService);
    prismaHealth = module.get(PrismaHealthIndicator);
  });

  it('GET /health checks database connectivity (readiness alias)', async () => {
    health.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
    await controller.check();

    expect(health.check).toHaveBeenCalledTimes(1);
    const indicators = health.check.mock.calls[0][0];
    await indicators[0]();
    expect(prismaHealth.isHealthy).toHaveBeenCalledWith('database');
  });

  it('GET /health/live runs no dependency checks', async () => {
    health.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
    await controller.live();

    expect(health.check).toHaveBeenCalledWith([]);
    expect(prismaHealth.isHealthy).not.toHaveBeenCalled();
  });

  it('GET /health/ready checks database connectivity', async () => {
    health.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
    await controller.ready();

    expect(health.check).toHaveBeenCalledTimes(1);
    const indicators = health.check.mock.calls[0][0];
    await indicators[0]();
    expect(prismaHealth.isHealthy).toHaveBeenCalledWith('database');
  });
});
