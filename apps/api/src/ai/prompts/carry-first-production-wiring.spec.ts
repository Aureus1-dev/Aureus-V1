import {
  MEMBER_STEWARD_SYSTEM_PROMPT,
  MEMBER_STEWARD_VOICE_SYSTEM_PROMPT,
} from './member-steward-system-prompt';
import {
  PLATFORM_ASSISTANT_SYSTEM_PROMPT,
  VOICE_ASSISTANT_SYSTEM_PROMPT,
} from './system-prompts.util';

describe('STEWARD-CARRY-001 — production carry-first wiring', () => {
  it('uses the living Member Steward contract for production text instead of the old platform-assistant persona', () => {
    expect(PLATFORM_ASSISTANT_SYSTEM_PROMPT).toBe(MEMBER_STEWARD_SYSTEM_PROMPT);
    expect(PLATFORM_ASSISTANT_SYSTEM_PROMPT).toContain('You are the Aureus Member Steward');
    expect(PLATFORM_ASSISTANT_SYSTEM_PROMPT).not.toContain('the member always acts for themselves');
  });

  it('uses the same carry contract for production voice', () => {
    expect(VOICE_ASSISTANT_SYSTEM_PROMPT).toBe(MEMBER_STEWARD_VOICE_SYSTEM_PROMPT);
    expect(VOICE_ASSISTANT_SYSTEM_PROMPT).toContain('Carry is the default operating model');
    expect(VOICE_ASSISTANT_SYSTEM_PROMPT).toContain('A boundary on one action is not a boundary on the whole mission');
  });

  it('regresses the founder housing handoff failure without making false execution claims', () => {
    const prompt = PLATFORM_ASSISTANT_SYSTEM_PROMPT;

    expect(prompt).toContain(
      'Never make the default workflow "go search/call/collect this yourself, then paste everything back here so I can organize it."',
    );
    expect(prompt).toContain(
      'Do not tell the member to copy and paste an entire research trail back into chat as the normal way to receive help',
    );
    expect(prompt).toContain(
      'When a route such as a hotline, agency, landlord, employer, provider, school, benefits office, or other third party must ultimately be contacted',
    );
    expect(prompt).toContain('do not stop at "call them."');
    expect(prompt).toContain('Never claim that unavailable external work happened');
  });

  it('applies the anti-handoff rule across common real-life domains, not housing only', () => {
    const prompt = PLATFORM_ASSISTANT_SYSTEM_PROMPT;

    for (const domain of [
      'money',
      'rent',
      'food',
      'housing',
      'job',
      'benefits',
      'health',
      'transportation',
      'legal help',
      'family',
      'school',
    ]) {
      expect(prompt).toContain(domain);
    }

    expect(prompt).toContain(
      'Ask the member to act only when the step genuinely requires something Aureus cannot responsibly supply or authorize',
    );
  });
});
