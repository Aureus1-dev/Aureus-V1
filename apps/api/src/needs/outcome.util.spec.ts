import { isOutcomeUnclear } from './outcome.util';

describe('isOutcomeUnclear', () => {
  it.each(['', '   '])('treats %j as unclear', (content) => {
    expect(isOutcomeUnclear(content)).toBe(true);
  });

  it('treats a need that only describes a situation, with no stated result, as unclear', () => {
    expect(isOutcomeUnclear('My landlord gave me an eviction notice for Friday')).toBe(true);
    expect(isOutcomeUnclear('I lost my job last week')).toBe(true);
    expect(isOutcomeUnclear('My car broke down and I have no way to get to work')).toBe(true);
  });

  it.each([
    'I need help finding emergency housing before Friday',
    "I'd like to find a job in food service",
    'I want to keep my apartment',
    "I'm trying to find a job near Chester County",
    'I am hoping to get back on my feet financially',
    'Looking for legal help to fight this eviction',
    'I need to pay my electric bill before it gets shut off',
    'Help me find food assistance for this week',
    'I have to find childcare so I can get to my interview',
  ])('treats %j as a clear outcome', (content) => {
    expect(isOutcomeUnclear(content)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isOutcomeUnclear('I NEED HELP FINDING A JOB')).toBe(false);
  });

  it('treats a direct question as already clear — Aureus should answer it, not ask what would help', () => {
    expect(isOutcomeUnclear('What is a Journey?')).toBe(false);
    expect(isOutcomeUnclear('How do I update my profile?')).toBe(false);
  });

  it('treats a direct interface command as already clear — it is already answerable by Dynamic Screen Orchestration (DOMAIN-007)', () => {
    expect(isOutcomeUnclear('Show me my opportunities')).toBe(false);
    expect(isOutcomeUnclear('Show me my journey')).toBe(false);
    expect(isOutcomeUnclear('Take me to my profile')).toBe(false);
    expect(isOutcomeUnclear('Open my notifications')).toBe(false);
  });
});
