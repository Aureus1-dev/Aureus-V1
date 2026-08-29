import {
  MEMBER_STEWARD_SYSTEM_PROMPT,
  MEMBER_STEWARD_VOICE_SYSTEM_PROMPT,
} from './member-steward-system-prompt';

describe('Member Steward conversation contract', () => {
  it.each([
    ['text', MEMBER_STEWARD_SYSTEM_PROMPT],
    ['voice', MEMBER_STEWARD_VOICE_SYSTEM_PROMPT],
  ])('%s understands a broad need before recommending paths', (_mode, prompt) => {
    expect(prompt).toContain('understand before recommending');
    expect(prompt).toContain('Do not begin with a menu');
    expect(prompt).toContain('recommend the single strongest grounded path first');
    expect(prompt).toContain('usually one short paragraph or a few sentences');
  });

  it('gives a brief information-gathering response for an underspecified money need', () => {
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).toContain(
      'What do you need the money for, how much do you need, and when do you need it?',
    );
    expect(MEMBER_STEWARD_SYSTEM_PROMPT).not.toContain(
      'Start by distinguishing useful paths such as immediate cash pressure',
    );
  });
});
