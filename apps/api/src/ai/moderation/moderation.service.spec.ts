import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModerationService } from './moderation.service';
import type { AiCompletionMessage } from '../providers/ai-provider.interface';

const mockConfig = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;

describe('ModerationService', () => {
  let service: ModerationService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [ModerationService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();
    service = m.get(ModerationService);
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns not-flagged with no OpenAI call when there are no user-role messages', async () => {
    const messages: AiCompletionMessage[] = [{ role: 'system', content: 'You are a helpful assistant.' }];

    const result = await service.checkMessages(messages);

    expect(result).toEqual({ flagged: false, categories: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('when AI_PROVIDER=openai and OPENAI_API_KEY is configured', () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'AI_PROVIDER') return 'openai';
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        return undefined;
      });
    });

    it('calls the real OpenAI moderation endpoint and returns its flagged categories', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ flagged: true, categories: { 'self-harm': true, violence: false } }] }),
      } as Response);

      const result = await service.checkMessages([{ role: 'user', content: 'something concerning' }]);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/moderations',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.flagged).toBe(true);
      expect(result.categories).toEqual(['self-harm']);
    });

    it('returns not-flagged when OpenAI reports nothing flagged', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ flagged: false, categories: {} }] }),
      } as Response);

      const result = await service.checkMessages([{ role: 'user', content: 'What opportunities are available?' }]);

      expect(result).toEqual({ flagged: false, categories: [] });
    });

    it('falls back to the deterministic check when the OpenAI call fails (non-OK response)', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' } as Response);

      const result = await service.checkMessages([{ role: 'user', content: 'I want to kill myself' }]);

      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('self-harm');
    });

    it('falls back to the deterministic check when the OpenAI call throws', async () => {
      fetchSpy.mockRejectedValue(new Error('network error'));

      const result = await service.checkMessages([{ role: 'user', content: 'I want to kill myself' }]);

      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('self-harm');
    });
  });

  describe('when an OpenAI key is present but AI_PROVIDER is not "openai"', () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'AI_PROVIDER') return 'stub';
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        return undefined;
      });
    });

    it('never calls the real OpenAI endpoint, using the deterministic fallback instead', async () => {
      const result = await service.checkMessages([{ role: 'user', content: 'I want to kill myself' }]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('self-harm');
    });
  });

  describe('when no OpenAI API key is configured', () => {
    beforeEach(() => {
      mockConfig.get.mockReturnValue(undefined);
    });

    it('uses the deterministic fallback check without calling fetch', async () => {
      const result = await service.checkMessages([{ role: 'user', content: 'I want to kill myself' }]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.flagged).toBe(true);
      expect(result.categories).toContain('self-harm');
    });

    it('returns not-flagged for benign content', async () => {
      const result = await service.checkMessages([{ role: 'user', content: 'What opportunities are available?' }]);

      expect(result).toEqual({ flagged: false, categories: [] });
    });
  });
});
