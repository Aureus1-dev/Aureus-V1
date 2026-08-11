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
      expect.arrayContaining([
        'welcome',
        'conversation',
        'home',
        'journey',
        'opportunities',
        'steward',
      ]),
    );
  });

  it('never advertises placeholder-only rooms in the Founder pilot', () => {
    expect(primarySurfaces.map((s) => s.id)).not.toEqual(
      expect.arrayContaining(['community', 'calendar', 'settings', 'search', 'help']),
    );
  });

  it('includes the new Plans surface for the Planning Table room', () => {
    const plans = primarySurfaces.find((s) => s.id === 'plans');
    expect(plans).toEqual({ id: 'plans', label: 'Plans', href: '/plans', tier: 'primary' });
  });

  it('curates the Steward Workspace nav to operational primary-tier surfaces only', () => {
    const primaryTierIds = primarySurfaces.filter((s) => s.tier === 'primary').map((s) => s.id);
    expect(primaryTierIds.sort()).toEqual(
      ['conversation', 'documents', 'journey', 'opportunities', 'plans'].sort(),
    );
    expect(primarySurfaces.every((s) => s.tier === 'primary' || s.tier === 'secondary')).toBe(true);
  });
});
