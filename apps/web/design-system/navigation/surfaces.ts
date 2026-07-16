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

export const primarySurfaces: SurfaceDefinition[] = [
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
  { id: 'permissions', label: 'Permissions & Connected Accounts', href: '/permissions' },
  { id: 'search', label: 'Search', href: '/search' },
  { id: 'help', label: 'Help & Support', href: '/help' },
];
