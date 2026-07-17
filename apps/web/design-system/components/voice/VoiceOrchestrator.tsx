'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHighlightRegistry, useInterfaceState, useVoice, type PendingToolCall } from '../../../state';
import { executeInterfaceTool } from '../steward/execute-interface-tool';

/**
 * Executes Dynamic Screen Orchestration tool calls (DOMAIN-005, Founder
 * Decision 2; extended with `open_panel`/`close_panel` by DOMAIN-007
 * Founder Decision 1) — the voice-side caller of the shared
 * `executeInterfaceTool` (also used by `TextInterfaceOrchestrator`, so
 * "one AI Steward, multiple communication modalities" holds for
 * execution, not just the tool contract). Mounted once, near the root of
 * the authenticated app shell (`app/(member)/layout.tsx`), so it can act
 * regardless of which screen is currently visible.
 *
 * Kept deliberately separate from `VoiceContext` (which stays
 * protocol-only — it neither knows about routing nor the Highlight
 * Registry) and separate from the Highlight Registry itself (a pure
 * DOM-ref bookkeeping primitive that knows nothing about voice). This
 * component is the only place that knows all of them, mirroring the same
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
  const { openPanel, closePanel } = useInterfaceState();
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
    const result = executeInterfaceTool(call.name, call.arguments, {
      navigate: (path) => router.push(path),
      activateHighlight: activate,
      focusField,
      openPanel,
      closePanel,
    });
    resolveToolCall(call.callId, { ...result });
  }

  return null;
}
