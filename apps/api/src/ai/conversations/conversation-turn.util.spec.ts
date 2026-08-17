import {
  directHallReply,
  ensureVisibleAssistantContent,
  isConversationalTurnWithoutNeed,
} from './conversation-turn.util';

describe('conversation-turn utilities', () => {
  describe('isConversationalTurnWithoutNeed', () => {
    it.each(['Hello', 'hi!', 'What day is it', 'Can we talk'])('%s bypasses intake gating', (content) => {
      expect(isConversationalTurnWithoutNeed(content)).toBe(true);
    });

    it.each(['help', 'money', 'My water bill is late'])('%s remains eligible for need intake', (content) => {
      expect(isConversationalTurnWithoutNeed(content)).toBe(false);
    });
  });

  describe('directHallReply', () => {
    it('greets normally instead of asking for a more specific need', () => {
      expect(directHallReply('Hello')).toBe('Hello. How can we help?');
    });

    it('answers the current day deterministically', () => {
      expect(directHallReply('Yes what day is it', new Date('2026-08-17T09:30:00.000Z'))).toBe(
        'Today is Monday, August 17, 2026.',
      );
    });

    it('points a request to talk at the Hall Talk control', () => {
      expect(directHallReply('Can we talk')).toBe(
        'Yes. Tap Talk beside the message box and we can continue by voice.',
      );
    });
  });

  describe('ensureVisibleAssistantContent', () => {
    it('preserves normal assistant content', () => {
      expect(ensureVisibleAssistantContent('  Here is the answer.  ')).toBe('Here is the answer.');
    });

    it('never allows an empty provider response to become a blank bubble', () => {
      expect(ensureVisibleAssistantContent('   ')).toMatch(/couldn't finish/i);
    });

    it('provides visible copy for a tool-only response', () => {
      expect(
        ensureVisibleAssistantContent('', [{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"home"}' }]),
      ).toBe("I'm on it.");
    });
  });
});
