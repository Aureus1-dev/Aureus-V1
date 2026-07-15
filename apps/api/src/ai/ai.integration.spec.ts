import { randomUUID } from 'crypto';
import { AiCapability, AiMessageRole, AiProvider, AiRequestStatus, LearningDomain } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaAiConversationRepository } from './conversations/repositories/prisma-ai-conversation.repository';
import { PrismaAiMessageRepository } from './conversations/repositories/prisma-ai-message.repository';
import { PrismaAiRequestRepository } from './requests/repositories/prisma-ai-request.repository';
import { PrismaAiRecommendationRepository } from './recommendations/repositories/prisma-ai-recommendation.repository';
import { PrismaCourseRepository } from '../academy/courses/repositories/prisma-course.repository';

/**
 * Integration test: exercises the AI Intelligence Engine's Prisma
 * repositories against a real PostgreSQL database (no mocks) — verifying
 * the real FK from AiConversation/AiRequest/AiRecommendation to User (a
 * genuine per-user record, ADR-015 Decision 5), conversation message
 * ordering, and the mutually-exclusive nullable target FKs on
 * AiRecommendation reusing the StewardshipRecommendation precedent.
 *
 * Requires DATABASE_URL to point at a reachable, migrated database.
 */
describe('AI Intelligence Engine — Prisma integration', () => {
  let prisma: PrismaService;
  let conversationRepo: PrismaAiConversationRepository;
  let messageRepo: PrismaAiMessageRepository;
  let requestRepo: PrismaAiRequestRepository;
  let recommendationRepo: PrismaAiRecommendationRepository;
  let courseRepo: PrismaCourseRepository;

  const emailMarker = `integration-wo029-${randomUUID()}`;
  const markerTitlePrefix = `INTEGRATION-TEST-${randomUUID()}-`;
  let userId: string;
  const courseIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    conversationRepo = new PrismaAiConversationRepository(prisma);
    messageRepo = new PrismaAiMessageRepository(prisma);
    requestRepo = new PrismaAiRequestRepository(prisma);
    recommendationRepo = new PrismaAiRecommendationRepository(prisma);
    courseRepo = new PrismaCourseRepository(prisma);

    const user = await prisma.db.user.create({ data: { email: `user-${emailMarker}@example.test` } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.db.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.db.user.deleteMany({ where: { email: { contains: emailMarker } } });
    await prisma.onModuleDestroy();
  });

  it('creates an AiConversation with a real FK to User and appends ordered messages', async () => {
    const conversation = await conversationRepo.create({ userId, title: 'Test chat' });
    expect(conversation.userId).toBe(userId);

    await messageRepo.create({ conversationId: conversation.id, role: AiMessageRole.USER, content: 'First' });
    await messageRepo.create({ conversationId: conversation.id, role: AiMessageRole.ASSISTANT, content: 'Second' });

    const messages = await messageRepo.findByConversation(conversation.id);
    expect(messages.map((m) => m.content)).toEqual(['First', 'Second']);
  });

  it('rejects an AiConversation for a nonexistent user (real FK enforcement)', async () => {
    await expect(conversationRepo.create({ userId: randomUUID() })).rejects.toThrow();
  });

  it('persists an AiRequest with a real FK to User', async () => {
    const request = await requestRepo.create({
      userId, capability: AiCapability.QUESTION_ANSWERING, provider: AiProvider.STUB, model: 'stub',
      promptTokens: 10, completionTokens: 5, costUsd: 0, latencyMs: 15, status: AiRequestStatus.SUCCESS,
    });
    expect(request.userId).toBe(userId);

    const found = await requestRepo.findById(request.id);
    expect(found?.id).toBe(request.id);
  });

  it('persists an AiRecommendation with a real, nullable, single-populated target FK', async () => {
    const course = await courseRepo.create({
      title: `${markerTitlePrefix}Course`, shortDescription: 'x', fullDescription: 'y full description here',
      learningDomain: LearningDomain.CAREER_READINESS, authorId: userId, lastUpdatedById: userId,
    });
    courseIds.push(course.id);

    const recommendation = await recommendationRepo.create({
      userId, courseId: course.id, rationale: 'Matches your goals.',
    });
    expect(recommendation.courseId).toBe(course.id);
    expect(recommendation.opportunityId).toBeNull();
    expect(recommendation.resourceId).toBeNull();

    const existing = await recommendationRepo.findExistingPending(userId, { courseId: course.id });
    expect(existing?.id).toBe(recommendation.id);

    const noMatch = await recommendationRepo.findExistingPending(userId, { courseId: randomUUID() });
    expect(noMatch).toBeNull();
  });
});
