import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { AiProviderHealthIndicator } from './ai-provider-health.indicator';

describe('HealthController (PD-002)', () => {
  let controller: HealthController;
  let health: jest.Mocked<HealthCheckService>;
  let prismaHealth: jest.Mocked<PrismaHealthIndicator>;
  let aiProviderHealth: jest.Mocked<AiProviderHealthIndicator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: PrismaHealthIndicator, useValue: { isHealthy: jest.fn() } },
        { provide: AiProviderHealthIndicator, useValue: { isHealthy: jest.fn() } },
      ],
    }).compile();

    controller = module.get(HealthController);
    health = module.get(HealthCheckService);
    prismaHealth = module.get(PrismaHealthIndicator);
    aiProviderHealth = module.get(AiProviderHealthIndicator);
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

  it('GET /health/version reports the running immutable commit without claiming one when absent', () => {
    const previousRenderCommit = process.env.RENDER_GIT_COMMIT;
    const previousAureusCommit = process.env.AUREUS_COMMIT_SHA;
    const previousServiceId = process.env.RENDER_SERVICE_ID;
    const previousInstanceId = process.env.RENDER_INSTANCE_ID;

    try {
      process.env.RENDER_GIT_COMMIT = '0123456789abcdef0123456789abcdef01234567';
      process.env.AUREUS_COMMIT_SHA = 'ffffffffffffffffffffffffffffffffffffffff';
      process.env.RENDER_SERVICE_ID = 'srv-api';
      process.env.RENDER_INSTANCE_ID = 'instance-api';

      expect(controller.version()).toEqual({
        service: 'api',
        commit: '0123456789abcdef0123456789abcdef01234567',
        serviceId: 'srv-api',
        instanceId: 'instance-api',
      });

      delete process.env.RENDER_GIT_COMMIT;
      delete process.env.AUREUS_COMMIT_SHA;
      expect(controller.version().commit).toBeNull();
    } finally {
      restoreEnvironment('RENDER_GIT_COMMIT', previousRenderCommit);
      restoreEnvironment('AUREUS_COMMIT_SHA', previousAureusCommit);
      restoreEnvironment('RENDER_SERVICE_ID', previousServiceId);
      restoreEnvironment('RENDER_INSTANCE_ID', previousInstanceId);
    }
  });

  it('GET /health/ai checks AI provider circuit-breaker state, not database connectivity', async () => {
    health.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
    await controller.ai();

    expect(health.check).toHaveBeenCalledTimes(1);
    const indicators = health.check.mock.calls[0][0];
    await indicators[0]();
    expect(aiProviderHealth.isHealthy).toHaveBeenCalledWith('aiProvider');
    expect(prismaHealth.isHealthy).not.toHaveBeenCalled();
  });
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
