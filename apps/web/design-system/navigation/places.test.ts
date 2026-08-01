import { primarySurfaces } from './surfaces';
import {
  HOUSEKEEPING_ROUTES,
  PLACE_IDS,
  PLACES,
  definitionForPath,
  placeForPath,
  reachablePlaces,
} from './places';

describe('places — seven rooms, not twenty-one modules', () => {
  it('names exactly the seven the canon names, and no others', () => {
    // AUREA-001 §THE LIVING HOME and AUREUS-003 §ORGANIZATION. Founder
    // ruling: "Do not create new canonical rooms, rename the seven
    // places…" — so this is a fence, not a description.
    expect([...PLACE_IDS]).toEqual([
      'hall',
      'library',
      'study',
      'circle',
      'workshop',
      'opportunity-center',
      'garden',
    ]);
  });

  it('gives every member surface exactly one place, or names it housekeeping', () => {
    // The mapping is the whole point: a route with no place would appear
    // to the member as a twenty-second module.
    const unaccounted = primarySurfaces.filter(
      (surface) =>
        placeForPath(surface.href) === null &&
        !HOUSEKEEPING_ROUTES.some((route) => surface.href === route),
    );
    expect(unaccounted.map((s) => s.href)).toEqual([]);
  });

  it('never files one route under two places', () => {
    const seen = new Map<string, string>();
    for (const id of PLACE_IDS) {
      for (const route of PLACES[id].routes) {
        expect(seen.has(route)).toBe(false);
        seen.set(route, id);
      }
    }
  });

  it('resolves nested paths to the place that contains them', () => {
    expect(placeForPath('/needs/abc-123')).toBe('hall');
    expect(placeForPath('/journey/step-2')).toBe('workshop');
    expect(placeForPath('/documents/report.pdf')).toBe('library');
  });

  it('treats arrival as the Hall before it has a name', () => {
    expect(placeForPath('/')).toBe('hall');
  });

  it('is total — an unmapped or missing path is a path with no place, never an error', () => {
    // A member should never be told the room they are standing in does
    // not exist.
    expect(placeForPath('/settings')).toBeNull();
    expect(placeForPath('/founder/review')).toBeNull();
    expect(placeForPath('/nothing-here')).toBeNull();
    expect(placeForPath(null)).toBeNull();
    expect(placeForPath(undefined)).toBeNull();
    expect(definitionForPath(undefined)).toBeNull();
  });

  it('offers no door to a room that has not been built', () => {
    // AUREUS-012 describes the Garden; the Garden does not exist yet.
    // LAUNCH-001 allows no pretended capability, so it has no entrance.
    expect(PLACES.garden.entrance).toBeNull();
    expect(reachablePlaces().map((p) => p.id)).not.toContain('garden');
    expect(reachablePlaces()).toHaveLength(PLACE_IDS.length - 1);
  });

  it('gives every reachable place an entrance that is a real member surface', () => {
    const hrefs = new Set(primarySurfaces.map((s) => s.href));
    for (const place of reachablePlaces()) {
      expect(hrefs.has(place.entrance!)).toBe(true);
    }
  });

  it('describes each place in the member’s words, not the system’s', () => {
    for (const id of PLACE_IDS) {
      const place = PLACES[id];
      expect(place.name.length).toBeGreaterThan(0);
      expect(place.purpose.length).toBeGreaterThan(0);
      // No route, module or feature vocabulary leaks into what a member reads.
      expect(place.purpose).not.toMatch(/route|surface|module|dashboard|panel|\//i);
    }
  });
});
