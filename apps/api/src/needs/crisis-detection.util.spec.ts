import { isCrisisLanguage } from './crisis-detection.util';

describe('isCrisisLanguage', () => {
  it.each([
    'I want to kill myself',
    "I'm suicidal and don't know what to do",
    'I have been thinking about suicide',
    'I want to end my life',
    "I can't go on anymore",
    'I have been hurting myself',
    'he is going to kill me tonight',
    "I'm not safe right now",
    'I think I am going to overdose',
  ])('detects crisis language in %j', (content) => {
    expect(isCrisisLanguage(content)).toBe(true);
  });

  it.each([
    'I need help finding a job',
    'I need housing assistance',
    'My landlord is threatening to evict me',
    'I need food assistance for my family',
    'help',
  ])('does not flag ordinary or ambiguous (non-crisis) input as crisis: %j', (content) => {
    expect(isCrisisLanguage(content)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isCrisisLanguage('I WANT TO KILL MYSELF')).toBe(true);
  });
});
