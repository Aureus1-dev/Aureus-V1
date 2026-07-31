import { primarySurfaces } from './surfaces';
import { V1_FEATURE_FLAGS } from '../../lib/config/v1-feature-scope';

describe('primarySurfaces', () => {
  it('excludes Academy and Pods while their V1 flags are off (C2 — "No Pods, no Academy")', () => {
    expect(V1_FEATURE_FLAGS.academy).toBe(false);
    expect(V1_FEATURE_FLAGS.pods).toBe(false);
    expect(primarySurfaces.map((s) => s.id)).not.toContain('academy');
    expect(primarySurfaces.map((s) => s.id)).not.toContain('pods');
  });

  it('still includes the standing member surfaces', () => {
    const ids = primarySurfaces.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['welcome', 'conversation', 'home', 'journey', 'opportunities', 'steward']),
    );
  });
});
