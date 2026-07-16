import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PodInsightsService } from './pod-insights.service';
import { PodsService } from '../../pods/pods.service';
import { PodMetricsService } from '../../pods/metrics/pod-metrics.service';
import { AiRequestsService } from '../requests/ai-requests.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const mockPodsService = { findAll: jest.fn() };
const mockPodMetrics = { getForPod: jest.fn(), computeRaw: jest.fn() };
const mockAiRequests = { runCompletion: jest.fn() };

describe('PodInsightsService — Institutional Wisdom (§7.2, Founder Decision #6): AI never monitors members', () => {
  let service: PodInsightsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        PodInsightsService,
        { provide: PodsService, useValue: mockPodsService },
        { provide: PodMetricsService, useValue: mockPodMetrics },
        { provide: AiRequestsService, useValue: mockAiRequests },
      ],
    }).compile();
    service = m.get(PodInsightsService);
    jest.clearAllMocks();
  });

  describe('generateForPod', () => {
    it('relies on PodMetricsService.getForPod for authorization — Steward-of-Pod or Admin only', async () => {
      mockPodMetrics.getForPod.mockRejectedValue(new ForbiddenException());
      await expect(service.generateForPod('pod-001', MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('generates insight from aggregate metrics only, never individual data', async () => {
      mockPodMetrics.getForPod.mockResolvedValue({
        podId: 'pod-001', activeMemberCount: 8, attendanceRatePercent: 80,
        serviceProjectCount: 2, serviceProjectsCompleted: 1, eventsHeldLast90Days: 5, generatedAt: new Date(),
      });
      mockAiRequests.runCompletion.mockResolvedValue({ content: 'Insight text', requestId: 'req-001' });

      const result = await service.generateForPod('pod-001', STEWARD);

      expect(result.content).toBe('Insight text');
      expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ userId: STEWARD.id, capability: 'POD_INSIGHT' }));
    });
  });

  describe('generatePlatformWide — Admin only, minimum-Pod-count threshold (k-anonymity discipline)', () => {
    it('rejects a non-Admin caller', async () => {
      await expect(service.generatePlatformWide(STEWARD)).rejects.toThrow(ForbiddenException);
    });

    it('rejects generating a cross-Pod report with too few Pods to preserve anonymity', async () => {
      mockPodsService.findAll.mockResolvedValue({ data: [{ id: 'p1' }, { id: 'p2' }], total: 2, page: 1, limit: 100, totalPages: 1 });
      await expect(service.generatePlatformWide(ADMIN)).rejects.toThrow(ForbiddenException);
    });

    it('generates a cross-Pod pattern report once the minimum-Pod-count threshold is met', async () => {
      const pods = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` }));
      mockPodsService.findAll.mockResolvedValue({ data: pods, total: 5, page: 1, limit: 100, totalPages: 1 });
      mockPodMetrics.computeRaw.mockResolvedValue({
        podId: 'p', activeMemberCount: 5, attendanceRatePercent: 60, serviceProjectCount: 1, serviceProjectsCompleted: 0, eventsHeldLast90Days: 3, generatedAt: new Date(),
      });
      mockAiRequests.runCompletion.mockResolvedValue({ content: 'Pattern report', requestId: 'req-002' });

      const result = await service.generatePlatformWide(ADMIN);
      expect(result.content).toBe('Pattern report');
    });
  });
});
