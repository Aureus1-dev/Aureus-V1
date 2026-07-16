import { EmptyState } from '../components';

export interface PlaceholderSurfaceProps {
  title: string;
  description?: string;
}

/**
 * Routing-scaffold placeholder (FPB-015 Phase One "routing architecture").
 * Establishes that a surface exists and renders inside the shell, without
 * building the surface's actual member experience — that is later-phase
 * work gated by FPB-015.
 */
export function PlaceholderSurface({ title, description }: PlaceholderSurfaceProps) {
  return (
    <EmptyState
      title={title}
      description={description ?? 'This surface is scaffolded by FWO-001 and will be implemented in a later work order.'}
    />
  );
}
