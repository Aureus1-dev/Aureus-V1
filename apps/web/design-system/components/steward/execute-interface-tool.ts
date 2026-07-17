import { VOICE_ALLOWED_ROUTE_PATHS } from '../voice/voice-routes';
import { INTERFACE_ALLOWED_PANEL_IDS } from './interface-tool-allowlists';

export interface InterfaceToolDeps {
  navigate: (path: string) => void;
  activateHighlight: (targetId: string) => boolean;
  focusField: (targetId: string) => boolean;
  openPanel: (panelId: string) => void;
  closePanel: (panelId: string) => void;
}

export interface ToolExecutionResult {
  ok: boolean;
  error?: string;
}

/**
 * The one place a steward-requested interface action becomes a real
 * effect — shared by voice (`VoiceOrchestrator`) and text
 * (`TextInterfaceOrchestrator`) so "one AI Steward, multiple
 * communication modalities" (DOMAIN-007 Founder Decision 1) is true of
 * the execution path, not just the backend tool contract. Kept pure and
 * synchronous: callers own how they report the result back (voice
 * reports over the data channel; text does not need to, since these
 * tools are side-effect-only and require no follow-up reasoning turn).
 */
export function executeInterfaceTool(name: string, argumentsJson: string, deps: InterfaceToolDeps): ToolExecutionResult {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argumentsJson) as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'Could not parse the tool call arguments.' };
  }

  switch (name) {
    case 'navigate_to_route': {
      const route = typeof args.route === 'string' ? args.route : '';
      const path = VOICE_ALLOWED_ROUTE_PATHS[route];
      if (!path) return { ok: false, error: `"${route}" is not an approved route.` };
      deps.navigate(path);
      return { ok: true };
    }

    case 'focus_interface_target': {
      const targetId = typeof args.targetId === 'string' ? args.targetId : '';
      return deps.activateHighlight(targetId) ? { ok: true } : { ok: false, error: `"${targetId}" is not currently visible.` };
    }

    case 'focus_form_field': {
      const targetId = typeof args.targetId === 'string' ? args.targetId : '';
      return deps.focusField(targetId) ? { ok: true } : { ok: false, error: `"${targetId}" is not currently visible.` };
    }

    case 'open_panel': {
      const panelId = typeof args.panelId === 'string' ? args.panelId : '';
      if (!INTERFACE_ALLOWED_PANEL_IDS.includes(panelId as never)) {
        return { ok: false, error: `"${panelId}" is not an approved panel.` };
      }
      deps.openPanel(panelId);
      return { ok: true };
    }

    case 'close_panel': {
      const panelId = typeof args.panelId === 'string' ? args.panelId : '';
      if (!INTERFACE_ALLOWED_PANEL_IDS.includes(panelId as never)) {
        return { ok: false, error: `"${panelId}" is not an approved panel.` };
      }
      deps.closePanel(panelId);
      return { ok: true };
    }

    default:
      return { ok: false, error: `"${name}" is not a recognized tool.` };
  }
}
