import { isOutcomeUnclear } from './outcome.util';

describe('isOutcomeUnclear', () => {
  it.each(['', '   '])('treats %j as unclear', (content) => {
    expect(isOutcomeUnclear(content)).toBe(true);
  });

  it('still asks when a statement supplies neither a goal nor a concrete hardship', () => {
    expect(isOutcomeUnclear('I lost my job last week')).toBe(true);
    expect(isOutcomeUnclear('My car broke down and I have no way to get to work')).toBe(true);
    expect(isOutcomeUnclear('Things have been difficult lately')).toBe(true);
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

  it.each([
    'My water bill is late and being shut off',
    'My rent is past due',
    'I am behind on my electric bill',
    'My landlord gave me an eviction notice for Friday',
    'I am getting evicted',
    "I can't pay my gas bill",
    'My car is being repossessed',
  ])('treats concrete hardship %j as sufficient to begin useful work', (content) => {
    expect(isOutcomeUnclear(content)).toBe(false);
  });

  it.each(['money', 'rent', 'food', 'job', 'housing', 'benefits', 'medicine', 'utilities'])(
    'treats concise need %j as sufficient to begin useful work without repeating the broad arrival question',
    (content) => {
      expect(isOutcomeUnclear(content)).toBe(false);
    },
  );

  it('is case-insensitive', () => {
    expect(isOutcomeUnclear('I NEED HELP FINDING A JOB')).toBe(false);
    expect(isOutcomeUnclear('MONEY')).toBe(false);
    expect(isOutcomeUnclear('MY WATER IS BEING SHUT OFF')).toBe(false);
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
