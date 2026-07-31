import { getEnvironmentalTime, NEUTRAL_ENVIRONMENTAL_TIME } from './getEnvironmentalTime';

describe('getEnvironmentalTime', () => {
  it.each([
    ['morning', 5], ['morning', 11],
    ['afternoon', 12], ['afternoon', 16],
    ['evening', 17], ['evening', 21],
    ['night', 22], ['night', 4], ['night', 0],
  ])('reads %s at %i:00, following the rhythm of the day', (expected, hour) => {
    expect(getEnvironmentalTime(new Date(2026, 0, 1, hour, 0, 0))).toBe(expected);
  });

  it('is total — every hour of the day maps to a period, so the room is never unlit', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(
        getEnvironmentalTime(new Date(2026, 0, 1, hour, 30, 0)),
      );
    }
  });

  it('offers a neutral, fully-composed default for the server, which cannot know the member’s hour', () => {
    expect(NEUTRAL_ENVIRONMENTAL_TIME).toBe('afternoon');
  });
});
