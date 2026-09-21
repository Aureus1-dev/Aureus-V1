import {
  MEMBER_STEWARD_SYSTEM_PROMPT,
  MEMBER_STEWARD_VOICE_SYSTEM_PROMPT,
} from './member-steward-system-prompt';

describe('Member Steward living-conversation contract', () => {
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
  });
});

describe('Work-first brevity contract (Founder walkthrough repair)', () => {
  it('scripts a brief, single-turn reply for a simple greeting, in both text and voice', () => {
    const greeting = 'Hi, I\'m Aureus, your AI steward. What are we trying to accomplish?';
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(greeting);
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).toContain(greeting);
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('then stop');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(
      'Do not follow it with an explanation of what Aureus is, a list of capabilities, a restated mission, onboarding narration, or multiple paragraphs',
    );
  });

  it('scripts a brief reply to "what can you do" that redirects to the member\'s goal', () => {
    const capabilityReply =
      "Tell me what you want to accomplish. I'll help figure it out and carry what I responsibly can.";
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(capabilityReply);
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).toContain(capabilityReply);
  });

  it('preserves continuity once an objective or active work is already established', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(
      'only when there is no established objective or active work',
    );
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('preserve continuity and respond in context');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(
      'Never re-ask for an objective Aureus already knows',
    );
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).toContain(
      'Never re-ask for an objective Aureus already knows',
    );
  });

  it('sets a firm 1-3 sentence default for ordinary conversation, with named exceptions', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('Brevity is a firm default, not a style preference');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('roughly 1-3 short sentences');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain('at most one next question');
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(
      'the task genuinely requires explanation, safety requires more context, or the member explicitly asks for detail',
    );
    // Brevity must never come at the cost of information the member actually needs.
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(
      'never omit information the member actually needs merely to stay short',
    );
  });

  it('never varies the steward name away from Aureus', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).not.toMatch(/\bOri\b/);
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).not.toMatch(/\bArius\b/);
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).not.toMatch(/\bOri\b/);
    expect(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT).not.toMatch(/\bArius\b/);
  });
});
