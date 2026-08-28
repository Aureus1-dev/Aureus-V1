import { OpportunityStatus, UserRole, VerificationStatus } from '@prisma/client';
import { OpportunitiesController } from './opportunities.controller';
import type { OpportunitiesService } from './opportunities.service';

describe('OpportunitiesController public listing boundary', () => {
  it('forces an unauthenticated caller to VERIFIED + ACTIVE even when query parameters ask for drafts', async () => {
    const service = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    } as unknown as jest.Mocked<OpportunitiesService>;
    const controller = new OpportunitiesController(service);

    await controller.findAll({
      status: OpportunityStatus.DRAFT,
      verificationStatus: VerificationStatus.DRAFT,
    });

    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OpportunityStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      }),
    );
  });

  it('forces an ordinary authenticated member to the same public boundary', async () => {
    const service = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    } as unknown as jest.Mocked<OpportunitiesService>;
    const controller = new OpportunitiesController(service);

    await controller.findAll(
      { verificationStatus: VerificationStatus.REJECTED, status: OpportunityStatus.ARCHIVED },
      { id: 'member-1', email: 'member@example.com', roles: [UserRole.MEMBER] },
    );

    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OpportunityStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      }),
    );
  });

  it('allows a Steward reviewer to request a non-public lifecycle state', async () => {
    const service = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    } as unknown as jest.Mocked<OpportunitiesService>;
    const controller = new OpportunitiesController(service);
    const query = { verificationStatus: VerificationStatus.PENDING_REVIEW, status: OpportunityStatus.DRAFT };

    await controller.findAll(query, {
      id: 'steward-1',
      email: 'steward@example.com',
      roles: [UserRole.STEWARD],
    });

    expect(service.findAll).toHaveBeenCalledWith(query);
  });
});
