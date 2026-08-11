import { V1_FEATURE_FLAGS } from '../../lib/config/v1-feature-scope';

/**
 * The 21 primary experience surfaces (FPB-002 §3, extended by the Living
 * Steward Workspace redesign). This is the single source of truth for both
 * navigation and the routing scaffold — a surface is added here once, not
 * duplicated across the nav and the route tree.
 *
 * `tier` drives the curated Steward Workspace nav (AppShell): `'primary'`
 * surfaces (Conversation, Journey, Plans, Opportunities, Documents,
 * Community, Calendar, Settings — the calm, quiet core) are always visible;
 * `'secondary'` surfaces are collapsed behind a disclosure rather than
 * removed — every route stays fully reachable, only the visual weight
 * changes (no functionality was cut).
 */
export interface SurfaceDefinition {
  id: string;
  label: string;
  href: string;
  tier: 'primary' | 'secondary';
}

/**
 * Founder-ready pilot rule (2026-08-11): a room is advertised only when a
 * member can complete its primary outcome. Direct routes remain available
 * to the Founder for build verification, but placeholder rooms must never
 * appear in the Hall index or command palette as if they were operational.
 */
const PILOT_HIDDEN_SURFACE_IDS = new Set(['community', 'calendar', 'settings', 'search', 'help']);

const ALL_SURFACES: SurfaceDefinition[] = [
  { id: 'welcome', label: 'Welcome', href: '/welcome', tier: 'secondary' },
  { id: 'conversation', label: 'Conversation', href: '/conversation', tier: 'primary' },
  { id: 'home', label: 'Home', href: '/home', tier: 'secondary' },
  { id: 'journey', label: 'Journey', href: '/journey', tier: 'primary' },
  { id: 'plans', label: 'Plans', href: '/plans', tier: 'primary' },
  { id: 'opportunities', label: 'Opportunities', href: '/opportunities', tier: 'primary' },
  { id: 'academy', label: 'Academy', href: '/academy', tier: 'secondary' },
  { id: 'community', label: 'Community', href: '/community', tier: 'primary' },
  { id: 'pods', label: 'Pods', href: '/pods', tier: 'secondary' },
  { id: 'steward', label: 'Steward', href: '/steward', tier: 'secondary' },
  { id: 'documents', label: 'Documents', href: '/documents', tier: 'primary' },
  { id: 'tasks', label: 'Tasks', href: '/tasks', tier: 'secondary' },
  { id: 'calendar', label: 'Calendar', href: '/calendar', tier: 'primary' },
  { id: 'notifications', label: 'Notifications', href: '/notifications', tier: 'secondary' },
  { id: 'messages', label: 'Messages', href: '/messages', tier: 'secondary' },
  { id: 'resources', label: 'Resources', href: '/resources', tier: 'secondary' },
  { id: 'profile', label: 'Profile', href: '/profile', tier: 'secondary' },
  { id: 'settings', label: 'Settings', href: '/settings', tier: 'primary' },
  { id: 'permissions', label: 'Connected Experiences', href: '/permissions', tier: 'secondary' },
  { id: 'search', label: 'Search', href: '/search', tier: 'secondary' },
  { id: 'help', label: 'Help & Support', href: '/help', tier: 'secondary' },
];

/**
 * C2 — V1 Scope Lockdown: Academy and Pods are explicitly cut for V1
 * (LAUNCH-001: "No Pods, no Academy"), so they're dropped from this list
 * whenever their flag is off — the same central check the API's
 * V1ScopeMiddleware and interface-tools.ts read.
 */
export const primarySurfaces: SurfaceDefinition[] = ALL_SURFACES.filter(
  (surface) =>
    !PILOT_HIDDEN_SURFACE_IDS.has(surface.id) &&
    (surface.id !== 'academy' || V1_FEATURE_FLAGS.academy) &&
    (surface.id !== 'pods' || V1_FEATURE_FLAGS.pods),
);
