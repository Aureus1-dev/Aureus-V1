import { V1_FEATURE_FLAGS } from '../../lib/config/v1-feature-scope';

/**
 * The 20 primary experience surfaces (FPB-002 §3). This is the single
 * source of truth for both primary navigation and the routing scaffold —
 * a surface is added here once, not duplicated across the nav and the
 * route tree.
 */
export interface SurfaceDefinition {
  id: string;
  label: string;
  href: string;
}

const ALL_SURFACES: SurfaceDefinition[] = [
  { id: 'welcome', label: 'Welcome', href: '/welcome' },
  { id: 'conversation', label: 'Conversation', href: '/conversation' },
  { id: 'home', label: 'Home', href: '/home' },
  { id: 'journey', label: 'Journey', href: '/journey' },
  { id: 'opportunities', label: 'Opportunities', href: '/opportunities' },
  { id: 'academy', label: 'Academy', href: '/academy' },
  { id: 'community', label: 'Community', href: '/community' },
  { id: 'pods', label: 'Pods', href: '/pods' },
  { id: 'steward', label: 'Steward', href: '/steward' },
  { id: 'documents', label: 'Documents', href: '/documents' },
  { id: 'tasks', label: 'Tasks', href: '/tasks' },
  { id: 'calendar', label: 'Calendar', href: '/calendar' },
  { id: 'notifications', label: 'Notifications', href: '/notifications' },
  { id: 'messages', label: 'Messages', href: '/messages' },
  { id: 'resources', label: 'Resources', href: '/resources' },
  { id: 'profile', label: 'Profile', href: '/profile' },
  { id: 'settings', label: 'Settings', href: '/settings' },
  { id: 'permissions', label: 'Connected Experiences', href: '/permissions' },
  { id: 'search', label: 'Search', href: '/search' },
  { id: 'help', label: 'Help & Support', href: '/help' },
];

/**
 * C2 — V1 Scope Lockdown: Academy and Pods are explicitly cut for V1
 * (LAUNCH-001: "No Pods, no Academy"), so they're dropped from this list
 * whenever their flag is off — the same central check the API's
 * V1ScopeMiddleware and interface-tools.ts read.
 */
export const primarySurfaces: SurfaceDefinition[] = ALL_SURFACES.filter(
  (surface) =>
    (surface.id !== 'academy' || V1_FEATURE_FLAGS.academy) &&
    (surface.id !== 'pods' || V1_FEATURE_FLAGS.pods),
);
