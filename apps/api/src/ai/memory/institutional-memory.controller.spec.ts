import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { InstitutionalMemoryController } from './institutional-memory.controller';
import { InstitutionalMemoryService, type InstitutionalMemoryContext } from './institutional-memory.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };

const CONTEXT: InstitutionalMemoryContext = {
  goals: [{ id: 'goal-1', title: 'Find a better job', status: 'ACTIVE' as never }],
  activeJourney: { id: 'journey-1', goalId: 'goal-1', title: 'Find a better job', completedMilestones: 1, totalMilestones: 3 },
  savedOpportunities: [{ id: 'opp-1', title: 'Career Training Grant' }],
  savedResources: [],
  podMemberships: [],
  stewardshipRelationship: null,
  recentConversationSnippets: ['I need help finding a job.'],
};

const mockService = { assembleContext: jest.fn() } as unknown as jest.Mocked<InstitutionalMemoryService>;

describe('InstitutionalMemoryController', () => {
  let controller: InstitutionalMemoryController;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      controllers: [InstitutionalMemoryController],
      providers: [{ provide: InstitutionalMemoryService, useValue: mockService }],
    }).compile();
    controller = m.get(InstitutionalMemoryController);
    jest.clearAllMocks();
  });

  it("returns the authenticated caller's own assembled memory context, verbatim", async () => {
    mockService.assembleContext.mockResolvedValue(CONTEXT);

    const result = await controller.getMine(USER);

    expect(mockService.assembleContext).toHaveBeenCalledWith(USER);
    expect(result).toBe(CONTEXT);
  });
});
