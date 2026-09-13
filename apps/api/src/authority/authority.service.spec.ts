import { BadRequestException } from '@nestjs/common';
import {
  AuthorityCapability,
  AuthorityContextType,
  AuthorityResourceClass,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorityService } from './authority.service';

describe('AuthorityService audit safety', () => {
  it('rejects secret-like evaluation metadata before any decision record can be written', async () => {
    const createDecision = jest.fn();
    const prisma = {
      db: {
        authorityDecision: { create: createDecision },
      },
    } as unknown as PrismaService;
    const service = new AuthorityService(prisma);

    await expect(
      service.evaluate({
        contextType: AuthorityContextType.PERSONAL,
        subjectUserId: '11111111-1111-4111-8111-111111111111',
        capability: AuthorityCapability.READ,
        resourceClass: AuthorityResourceClass.OTHER,
        resourceRef: 'api_key=do-not-store-this',
        purpose: 'Inspect a selected resource',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createDecision).not.toHaveBeenCalled();
  });
});
