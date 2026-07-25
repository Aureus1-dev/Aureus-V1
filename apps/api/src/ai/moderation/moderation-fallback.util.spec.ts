import { checkContentFallback } from './moderation-fallback.util';

describe('checkContentFallback', () => {
  it.each([
    ['I want to kill myself', 'self-harm'],
    ['thinking about suicide', 'self-harm'],
    ["i'm going to kill him", 'violence'],
    ['going to hurt someone tomorrow', 'violence'],
    ['subhuman race should be exterminate all people who', 'hate'],
  ])('flags "%s" as %s', (content, category) => {
    expect(checkContentFallback(content)).toContain(category);
  });

  it('is case-insensitive', () => {
    expect(checkContentFallback('I WANT TO KILL MYSELF')).toContain('self-harm');
  });

  it('returns an empty array for benign content', () => {
    expect(checkContentFallback('What opportunities are available for me this month?')).toEqual([]);
  });

  it('can return multiple categories for content matching more than one', () => {
    const result = checkContentFallback('I want to kill myself and I want to kill him too');
    expect(result).toContain('self-harm');
    expect(result).toContain('violence');
  });
});
