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
