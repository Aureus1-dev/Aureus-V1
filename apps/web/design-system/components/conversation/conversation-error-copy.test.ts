import { conversationErrorCopy } from './conversation-error-copy';

describe('conversationErrorCopy', () => {
  it('returns calm, non-technical copy for every error kind', () => {
    const kinds = ['authentication', 'rate-limited', 'unavailable', 'validation', 'network', 'unknown'] as const;
    for (const kind of kinds) {
      const copy = conversationErrorCopy(kind);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.description.length).toBeGreaterThan(0);
      expect(copy.description.toLowerCase()).not.toMatch(/exception|stack|undefined|null|500|econnrefused/);
    }
  });
});
