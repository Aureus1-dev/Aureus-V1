import {
  MEMBER_STEWARD_SYSTEM_PROMPT,
  MEMBER_STEWARD_VOICE_SYSTEM_PROMPT,
} from './member-steward-system-prompt';

describe('Member Steward living-conversation contract', () => {
  it('uses one named Steward character across text and voice', () => {
    for (const prompt of [MEMBER_STEWARD_SYSTEM_PROMPT, MEMBER_STEWARD_VOICE_SYSTEM_PROMPT]) {
      expect(prompt).toContain('You are Aureus, an AI Steward');
      expect(prompt).toContain('One character, many expressions');
      expect(prompt).toContain('first example of stewardship');
      expect(prompt).toContain('Never stereotype');
    }
  });

  it('governs participation, listening, brainstorming, truth, offers, and closure', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Treat conversation as participation, not a lecture');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Do not force action when listening is the work');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Brainstorm with the person');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Clearly distinguish known facts');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Never pressure, manufacture urgency');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain("Your time is yours. We'll be here when you need us.");
  });

  it('understands before listing and asks only one necessary question at a time', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Understand enough to act before listing possibilities');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Ask at most one necessary question at a time');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('lead with the single strongest grounded path');
  });

  it('requires a useful why and forbids theatrical work claims', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('briefly explain why you need it');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Never claim that you searched, checked, verified, contacted, submitted, or ruled something out');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Do not narrate private chain-of-thought');
  });

  it('carries the same work style into voice', () => {
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).toContain('Ask at most one necessary question at a time');
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).toContain('Never claim that you searched, checked, verified, contacted, submitted, or ruled something out');
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).toContain('Do not rush to fill silence');
  });
});
