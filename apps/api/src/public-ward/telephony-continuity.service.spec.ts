import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TelephonyContinuityService } from './telephony-continuity.service';

const configValues: Record<string, string> = {
  TELEPHONY_WEBHOOK_SECRET: 'w'.repeat(40),
  TELEPHONY_CONTINUATION_SECRET: 'c'.repeat(40),
  FRONTEND_URL: 'https://aureus.example',
};

function makeService() {
  const wardConversation = {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  };
  const prisma = { db: { wardConversation } } as any;
  const config = { get: jest.fn((key: string) => configValues[key]) } as any;
  const wards = {
    startConversation: jest.fn().mockResolvedValue({
      conversationId: '11111111-1111-4111-8111-111111111111',
      accessToken: 'A'.repeat(43),
    }),
  } as any;
  return { service: new TelephonyContinuityService(prisma, config, wards), wardConversation, wards };
}

describe('TelephonyContinuityService', () => {
  it('requires a configured provider webhook secret before creating phone continuity', async () => {
    const { service } = makeService();
    await expect(service.startPhoneContinuity('demo', undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.startPhoneContinuity('demo', 'wrong')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('fails closed when telephony itself is not configured', async () => {
    const { service } = makeService();
    const original = configValues.TELEPHONY_WEBHOOK_SECRET;
    configValues.TELEPHONY_WEBHOOK_SECRET = '';
    await expect(service.startPhoneContinuity('demo', 'anything')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    configValues.TELEPHONY_WEBHOOK_SECRET = original;
  });

  it('creates an opaque short-lived continuation without enabling recording', async () => {
    const { service, wards } = makeService();
    const result = await service.startPhoneContinuity('Demo', 'w'.repeat(40));
    expect(wards.startConversation).toHaveBeenCalledWith('Demo');
    expect(result.continuationUrl).toContain('https://aureus.example/ward/demo?continue=');
    expect(result.recording.enabled).toBe(false);
    expect(result.disclosure).toContain('not a human');
  });

  it('redeems once by rotating the current Ward bearer hash', async () => {
    const { service, wardConversation } = makeService();
    const started = await service.startPhoneContinuity('demo', 'w'.repeat(40));
    const token = new URL(started.continuationUrl).searchParams.get('continue')!;
    const crypto = await import('node:crypto');
    const oldHash = crypto.createHash('sha256').update('A'.repeat(43)).digest('hex');
    wardConversation.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      accessTokenHash: oldHash,
      tokenExpiresAt: new Date(Date.now() + 60_000),
    });
    wardConversation.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.redeem('demo', token);
    expect(result.accessToken).not.toBe('A'.repeat(43));
    expect(wardConversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accessTokenHash: oldHash }),
        data: expect.objectContaining({ accessTokenHash: expect.any(String) }),
      }),
    );
  });

  it('denies replay after the bearer hash no longer matches the signed token version', async () => {
    const { service, wardConversation } = makeService();
    const started = await service.startPhoneContinuity('demo', 'w'.repeat(40));
    const token = new URL(started.continuationUrl).searchParams.get('continue')!;
    wardConversation.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      accessTokenHash: 'f'.repeat(64),
      tokenExpiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.redeem('demo', token)).rejects.toBeInstanceOf(NotFoundException);
    expect(wardConversation.updateMany).not.toHaveBeenCalled();
  });

  it('pins redemption to the slug/tenant encoded into the signed continuation', async () => {
    const { service, wardConversation } = makeService();
    const started = await service.startPhoneContinuity('tenant-a', 'w'.repeat(40));
    const token = new URL(started.continuationUrl).searchParams.get('continue')!;
    await expect(service.redeem('tenant-b', token)).rejects.toBeInstanceOf(NotFoundException);
    expect(wardConversation.findFirst).not.toHaveBeenCalled();
  });
});
