'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHighlightRegistry, useVoice, type PendingToolCall } from '../../../state';
import { VOICE_ALLOWED_ROUTE_PATHS } from './voice-routes';

/**
 * Executes Dynamic Screen Orchestration tool calls (DOMAIN-005, Founder
 * Decision 2) — the one place voice intent becomes an actual interface
 * action. Mounted once, near the root of the authenticated app shell
 * (`app/(member)/layout.tsx`), so it can act regardless of which screen
 * is currently visible.
 *
 * Kept deliberately separate from `VoiceContext` (which stays
 * protocol-only — it neither knows about routing nor the Highlight
 * Registry) and separate from the Highlight Registry itself (a pure
 * DOM-ref bookkeeping primitive that knows nothing about voice). This
 * component is the only place that knows all three, mirroring the same
 * isolation discipline `RealtimeEventMapper` established for wire-format
 * translation (ADR-017 Decision 8) — extended here to "action execution
 * isolated from protocol handling."
 *
 * Every result — success or failure — is always reported back via
 * `resolveToolCall`, so the steward always learns what happened rather
 * than being left waiting silently.
 */
export function VoiceOrchestrator() {
  const router = useRouter();
  const { state, resolveToolCall } = useVoice();
  const { activate, focusField } = useHighlightRegistry();
  const handledCallIds = useRef(new Set<string>());

  useEffect(() => {
    for (const call of state.pendingToolCalls) {
      if (handledCallIds.current.has(call.callId)) continue;
      handledCallIds.current.add(call.callId);
      executeToolCall(call);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingToolCalls]);

  function executeToolCall(call: PendingToolCall) {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(call.arguments) as Record<string, unknown>;
    } catch {
      resolveToolCall(call.callId, { ok: false, error: 'Could not parse the tool call arguments.' });
      return;
    }

    switch (call.name) {
      case 'navigate_to_route': {
        const route = typeof args.route === 'string' ? args.route : '';
        const path = VOICE_ALLOWED_ROUTE_PATHS[route];
        if (!path) {
          resolveToolCall(call.callId, { ok: false, error: `"${route}" is not an approved route.` });
          return;
        }
        router.push(path);
        resolveToolCall(call.callId, { ok: true });
        return;
      }

      case 'focus_interface_target': {
        const targetId = typeof args.targetId === 'string' ? args.targetId : '';
        const found = activate(targetId);
        resolveToolCall(
          call.callId,
          found ? { ok: true } : { ok: false, error: `"${targetId}" is not currently visible.` },
        );
        return;
      }

      case 'focus_form_field': {
        const targetId = typeof args.targetId === 'string' ? args.targetId : '';
        const found = focusField(targetId);
        resolveToolCall(
          call.callId,
          found ? { ok: true } : { ok: false, error: `"${targetId}" is not currently visible.` },
        );
        return;
      }

      default:
        resolveToolCall(call.callId, { ok: false, error: `"${call.name}" is not a recognized tool.` });
    }
  }

  return null;
}
