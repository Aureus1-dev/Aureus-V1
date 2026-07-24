import { isAmbiguousNeed } from './ambiguity.util';

describe('isAmbiguousNeed', () => {
  it.each(['help', 'Help', '  help  ', 'i need help', 'not sure', 'something', "I don't know", 'idk', ''])(
    'treats %j as ambiguous',
    (content) => {
      expect(isAmbiguousNeed(content)).toBe(true);
    },
  );

  it('treats a short, low-information input as ambiguous', () => {
    expect(isAmbiguousNeed('stuff')).toBe(true);
  });

  it('treats a specific, meaningful stated need as not ambiguous', () => {
    expect(isAmbiguousNeed('I need help finding a job in food service near Chester County')).toBe(false);
    expect(isAmbiguousNeed('I got an eviction notice and need legal help fast')).toBe(false);
  });
});
