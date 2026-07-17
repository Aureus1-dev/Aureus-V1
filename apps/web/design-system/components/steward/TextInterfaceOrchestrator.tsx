'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation, useHighlightRegistry, useInterfaceState } from '../../../state';
import { executeInterfaceTool } from './execute-interface-tool';

/**
 * The text-side counterpart to `VoiceOrchestrator` (DOMAIN-007 Founder
 * Decision 1 — "a member who types 'show me my opportunities' should
 * receive the same safe interface guidance as a member who says it
 * aloud"). Both call the same `executeInterfaceTool`; they differ only
 * in how a pending call arrives and how its result is reported. Text
 * tool calls need no report-back round trip: these tools are pure
 * side-effects on the member's own screen, and the model's accompanying
 * reply already said whatever it needed to say in the same response that
 * requested the tool call — unlike voice, there is no live turn state
 * that would otherwise get stuck waiting for an acknowledgement.
 *
 * Mounted once, alongside `VoiceOrchestrator`, so it can act regardless
 * of which screen requested it (the Global Action Palette's "Ask your
 * Steward" entry, the Steward Workspace panel, or `/conversation`
 * itself).
 */
export function TextInterfaceOrchestrator() {
  const router = useRouter();
  const { state } = useConversation();
  const { activate, focusField } = useHighlightRegistry();
  const { openPanel, closePanel } = useInterfaceState();
  const handledCallIds = useRef(new Set<string>());

  useEffect(() => {
    for (const call of state.pendingToolCalls) {
      if (handledCallIds.current.has(call.callId)) continue;
      handledCallIds.current.add(call.callId);
      executeInterfaceTool(call.name, call.arguments, {
        navigate: (path) => router.push(path),
        activateHighlight: activate,
        focusField,
        openPanel,
        closePanel,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingToolCalls]);

  return null;
}
