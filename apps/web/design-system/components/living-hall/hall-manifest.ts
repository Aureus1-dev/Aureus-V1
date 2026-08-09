export type HallLightingStateId =
  | 'deep-night'
  | 'predawn'
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'golden-hour'
  | 'evening'
  | 'late-night';

export interface HallLightingState {
  id: HallLightingStateId;
  label: string;
  asset: string;
}

const ASSET_ROOT = '/environments/hall/lighting-states';

export const HALL_LIGHTING_STATES: readonly HallLightingState[] = [
  { id: 'deep-night', label: 'Deep night', asset: `${ASSET_ROOT}/01-deep-night-embers.webp` },
  { id: 'predawn', label: 'Predawn', asset: `${ASSET_ROOT}/02-predawn-first-breath.webp` },
  { id: 'dawn', label: 'Dawn', asset: `${ASSET_ROOT}/03-dawn-breakfast-bird.webp` },
  { id: 'morning', label: 'Morning', asset: `${ASSET_ROOT}/04-morning-awake.webp` },
  { id: 'noon', label: 'Noon', asset: `${ASSET_ROOT}/05-noon-clear.webp` },
  { id: 'afternoon', label: 'Afternoon', asset: `${ASSET_ROOT}/06-afternoon-steady.webp` },
  { id: 'golden-hour', label: 'Golden hour', asset: `${ASSET_ROOT}/07-golden-hour-return.webp` },
  { id: 'evening', label: 'Evening', asset: `${ASSET_ROOT}/08-evening-hearth.webp` },
  { id: 'late-night', label: 'Late night', asset: `${ASSET_ROOT}/09-late-night-settling.webp` },
] as const;

export function lightingStateAt(date: Date): HallLightingState {
  const hour = date.getHours();
  if (hour >= 5 && hour < 7) return HALL_LIGHTING_STATES[1];
  if (hour >= 7 && hour < 9) return HALL_LIGHTING_STATES[2];
  if (hour >= 9 && hour < 12) return HALL_LIGHTING_STATES[3];
  if (hour >= 12 && hour < 15) return HALL_LIGHTING_STATES[4];
  if (hour >= 15 && hour < 18) return HALL_LIGHTING_STATES[5];
  if (hour >= 18 && hour < 20) return HALL_LIGHTING_STATES[6];
  if (hour >= 20 && hour < 23) return HALL_LIGHTING_STATES[7];
  if (hour === 23) return HALL_LIGHTING_STATES[8];
  return HALL_LIGHTING_STATES[0];
}

export type HallRoomId =
  | 'hall'
  | 'journey'
  | 'planning'
  | 'opportunity'
  | 'documents'
  | 'community'
  | 'calendar'
  | 'quiet';

export interface HallRoomDefinition {
  id: HallRoomId;
  label: string;
}

export function hallRoomForPath(pathname: string | null): HallRoomDefinition {
  if (
    !pathname ||
    pathname === '/conversation' ||
    pathname === '/home' ||
    pathname === '/welcome'
  ) {
    return { id: 'hall', label: 'The Hall' };
  }
  if (pathname.startsWith('/journey') || pathname.startsWith('/tasks')) {
    return { id: 'journey', label: 'The Path' };
  }
  if (pathname.startsWith('/plans')) return { id: 'planning', label: 'The Planning Table' };
  if (pathname.startsWith('/opportunities') || pathname.startsWith('/resources')) {
    return { id: 'opportunity', label: 'The Opportunity Center' };
  }
  if (pathname.startsWith('/documents') || pathname.startsWith('/permissions')) {
    return { id: 'documents', label: 'The Study' };
  }
  if (pathname.startsWith('/community') || pathname.startsWith('/messages')) {
    return { id: 'community', label: 'The Circle' };
  }
  if (pathname.startsWith('/calendar')) return { id: 'calendar', label: 'The Calendar' };
  return { id: 'quiet', label: 'The Quiet Room' };
}
