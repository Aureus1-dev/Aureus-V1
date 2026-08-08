/**
 * The seven places of Aureus, and where the application's routes live
 * within them.
 *
 * ── Why this file exists ───────────────────────────────────────────
 *
 * The canon names seven places: the Hall, the Library, the Steward's
 * Study, the Circle, the Workshop, the Opportunity Center, the Garden
 * (AUREA-001 §THE LIVING HOME; AUREUS-003 §ORGANIZATION). The
 * application has twenty-one routes. Nothing in the canon mapped one to
 * the other, so navigation had no choice but to present the routes —
 * which is how a living home became a list of twenty software modules.
 *
 * Founder ruling: "Multiple technical routes and capabilities may exist
 * within each place. The member must experience seven understandable
 * places, not twenty-one software modules. Routes are implementation
 * details. Places are the member's mental model."
 *
 * So this is the seam. Routes keep their URLs — nothing is redirected,
 * nothing is renamed, no link breaks — and everything a member sees is
 * expressed in places.
 *
 * ── What is deliberately not a place ───────────────────────────────
 *
 * Settings, Profile, Connected Experiences, Notifications, Search and
 * Help are the settings of the house rather than rooms within it. A
 * member does not walk to their preferences. They are reachable, always,
 * but they are not somewhere you go, and presenting them as rooms would
 * put housekeeping on the same footing as the Circle.
 *
 * The Founder Operating System is not a member surface at all.
 */

/** The seven, in the order the canon lists them. */
export const PLACE_IDS = [
  'hall',
  'library',
  'study',
  'circle',
  'workshop',
  'opportunity-center',
  'garden',
] as const;

export type PlaceId = (typeof PLACE_IDS)[number];

export interface PlaceDefinition {
  id: PlaceId;
  /** What a member calls it. */
  name: string;
  /** What a member goes there for — one line, in their words, not the system's. */
  purpose: string;
  /** Where entering the place takes them. `null` where the place is not yet built. */
  entrance: string | null;
  /**
   * Routes that live inside this place. Order matters only for display;
   * the entrance is named separately because the first route is not
   * always the doorway.
   */
  routes: string[];
}

export const PLACES: Record<PlaceId, PlaceDefinition> = {
  hall: {
    id: 'hall',
    name: 'The Hall',
    purpose: 'Where you are, and where every conversation with your Steward happens.',
    entrance: '/home',
    routes: ['/home', '/welcome', '/conversation', '/needs'],
  },
  library: {
    id: 'library',
    name: 'The Library',
    purpose: 'Reading, references and the documents you are keeping.',
    entrance: '/resources',
    routes: ['/resources', '/documents', '/academy'],
  },
  study: {
    id: 'study',
    name: "The Steward's Study",
    purpose: 'Thinking something through: your plans, your tasks, what is coming up.',
    entrance: '/plans',
    routes: ['/steward', '/plans', '/tasks', '/calendar'],
  },
  circle: {
    id: 'circle',
    name: 'The Circle',
    purpose: 'The people — your community, and the messages between you.',
    entrance: '/community',
    routes: ['/community', '/messages', '/pods'],
  },
  workshop: {
    id: 'workshop',
    name: 'The Workshop',
    purpose: 'The work itself, and how far along it is.',
    entrance: '/journey',
    routes: ['/journey'],
  },
  'opportunity-center': {
    id: 'opportunity-center',
    name: 'The Opportunity Center',
    purpose: 'Practical help: work, benefits, housing, money, training.',
    entrance: '/opportunities',
    routes: ['/opportunities'],
  },
  garden: {
    id: 'garden',
    name: 'The Garden',
    purpose: 'Rest. Sometimes the next faithful step is to stop.',
    // Deliberately unbuilt. AUREUS-012 exists; the place does not yet.
    // A door to a room that is not there would be a promise Aureus has
    // not kept, and LAUNCH-001 allows no pretended capability.
    entrance: null,
    routes: [],
  },
};

/**
 * Routes that belong to no place: the settings of the house, plus the
 * administrative surface. Listed explicitly rather than inferred, so
 * that a route added later is a deliberate decision either way.
 */
export const HOUSEKEEPING_ROUTES = [
  '/settings',
  '/profile',
  '/permissions',
  '/notifications',
  '/search',
  '/help',
] as const;

/** Longest-prefix first, so `/needs/abc` resolves before a shorter match. */
const ROUTE_INDEX: { route: string; place: PlaceId }[] = PLACE_IDS.flatMap((id) =>
  PLACES[id].routes.map((route) => ({ route, place: id })),
).sort((a, b) => b.route.length - a.route.length);

/**
 * Which place a path is in, or `null` for housekeeping and for anything
 * outside the member experience.
 *
 * Total, and never throws: an unmapped path is a path with no place, not
 * an error. A member should never be told the room they are standing in
 * does not exist.
 */
export function placeForPath(pathname: string | null | undefined): PlaceId | null {
  if (!pathname) return null;
  // `/` is arrival, which is the Hall before it has a name.
  if (pathname === '/') return 'hall';
  const match = ROUTE_INDEX.find(
    ({ route }) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return match ? match.place : null;
}

/** The place, resolved, or `null`. Convenience for display code. */
export function definitionForPath(pathname: string | null | undefined): PlaceDefinition | null {
  const id = placeForPath(pathname);
  return id ? PLACES[id] : null;
}

/** Every place a member can actually walk into today. */
export function reachablePlaces(): PlaceDefinition[] {
  return PLACE_IDS.map((id) => PLACES[id]).filter((place) => place.entrance !== null);
}
