import { deriveUnderstandingPhase, CLARIFYING_QUESTION, OUTCOME_QUESTION } from './understanding-progress';
import type { MessageDto } from '../../../lib/api/conversations';

const NOW = '2026-01-01T00:00:00.000Z';
function msg(role: MessageDto['role'], content: string): MessageDto {
  return { id: `m-${Math.random()}`, conversationId: 'conv-1', role, content, createdAt: NOW };
}

describe('deriveUnderstandingPhase', () => {
  it('is "collecting" before any exchange has happened', () => {
    expect(deriveUnderstandingPhase([])).toEqual({ kind: 'collecting' });
  });

  it('is "collecting" while only the member has spoken (assistant reply not back yet)', () => {
    expect(deriveUnderstandingPhase([msg('USER', 'I need help finding a job')])).toEqual({ kind: 'collecting' });
  });

  it('is "outcome-question" when Aureus asked the Founder-approved wording', () => {
    const timeline = [msg('USER', 'My landlord gave me an eviction notice'), msg('ASSISTANT', OUTCOME_QUESTION)];
    expect(deriveUnderstandingPhase(timeline)).toEqual({ kind: 'outcome-question' });
  });

  it('is "clarifying" when Aureus asked the Gate C clarifying question', () => {
    const timeline = [msg('USER', 'help'), msg('ASSISTANT', CLARIFYING_QUESTION)];
    expect(deriveUnderstandingPhase(timeline)).toEqual({ kind: 'clarifying', priorMessage: CLARIFYING_QUESTION });
  });

  it('is "crisis" when the reply contains the 988 Suicide & Crisis Lifeline', () => {
    const crisisMessage = 'If you or someone else is in immediate danger, call 911 now. ... 988 ...';
    const timeline = [msg('USER', 'I want to end it all'), msg('ASSISTANT', crisisMessage)];
    expect(deriveUnderstandingPhase(timeline)).toEqual({ kind: 'crisis', priorMessage: crisisMessage });
  });

  it('is "understood" for any other assistant reply, carrying the original need and the reflection', () => {
    const timeline = [
      msg('USER', 'I need help finding stable housing before Friday'),
      msg('ASSISTANT', 'It sounds like finding stable housing before Friday is what matters most right now.'),
    ];
    expect(deriveUnderstandingPhase(timeline)).toEqual({
      kind: 'understood',
      originalNeed: 'I need help finding stable housing before Friday',
      reflection: 'It sounds like finding stable housing before Friday is what matters most right now.',
    });
  });

  it('reads the original need as the first USER message even across a multi-turn clarify-then-understand exchange', () => {
    const timeline = [
      msg('USER', 'help'),
      msg('ASSISTANT', CLARIFYING_QUESTION),
      msg('USER', 'I need help finding affordable housing in Chester County'),
      msg('ASSISTANT', 'Got it — affordable housing in Chester County.'),
    ];
    expect(deriveUnderstandingPhase(timeline)).toEqual({
      kind: 'understood',
      originalNeed: 'help',
      reflection: 'Got it — affordable housing in Chester County.',
    });
  });

  it('only ever looks at the most recent assistant reply to decide the current phase', () => {
    const timeline = [
      msg('USER', 'My landlord gave me an eviction notice'),
      msg('ASSISTANT', OUTCOME_QUESTION),
      msg('USER', 'I want to stay in my apartment'),
      msg('ASSISTANT', 'Got it — staying in your apartment.'),
    ];
    expect(deriveUnderstandingPhase(timeline).kind).toBe('understood');
  });
});
