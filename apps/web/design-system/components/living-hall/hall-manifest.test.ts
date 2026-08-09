import { HALL_LIGHTING_STATES, hallRoomForPath, lightingStateAt } from './hall-manifest';

describe('the Living Hall manifest', () => {
  it('contains every approved local-time lighting plate', () => {
    expect(HALL_LIGHTING_STATES).toHaveLength(9);
    expect(HALL_LIGHTING_STATES.map((state) => state.id)).toEqual([
      'deep-night',
      'predawn',
      'dawn',
      'morning',
      'noon',
      'afternoon',
      'golden-hour',
      'evening',
      'late-night',
    ]);
  });

  it('covers the full day without a blank hour', () => {
    const states = Array.from(
      { length: 24 },
      (_, hour) => lightingStateAt(new Date(2026, 0, 1, hour)).id,
    );
    expect(states).toHaveLength(24);
    expect(states.every(Boolean)).toBe(true);
  });

  it.each([
    ['/conversation', 'The Hall'],
    ['/journey', 'The Path'],
    ['/plans', 'The Planning Table'],
    ['/documents', 'The Study'],
    ['/community', 'The Circle'],
    ['/calendar', 'The Calendar'],
  ])('maps %s to %s', (path, label) => {
    expect(hallRoomForPath(path).label).toBe(label);
  });
});
