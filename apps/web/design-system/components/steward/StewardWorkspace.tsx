'use client';

import { useInterfaceState, useVoice } from '../../../state';
import { VoiceOrb } from '../voice/VoiceOrb';
import { VoiceStateLabel } from '../voice/VoiceStateLabel';
import { VoiceControls } from '../voice/VoiceControls';
import { VisuallyHidden } from '../../accessibility';
import { RecentConversationPreview } from './RecentConversationPreview';
import { NeedsYourDecision } from './NeedsYourDecision';
import { INTERFACE_ALLOWED_PANEL_IDS } from './interface-tool-allowlists';
import { V1_FEATURE_FLAGS } from '../../../lib/config/v1-feature-scope';
import styles from './StewardWorkspace.module.css';

const STEWARD_PANEL_ID = INTERFACE_ALLOWED_PANEL_IDS[0];
const LIVE_VOICE_STATES = new Set(['connecting', 'listening', 'thinking', 'speaking']);

/**
 * The persistent AI Steward Workspace (DOMAIN-007 Founder Decision 2) —
 * collapsed by default into a small, calm presence on every authenticated
 * screen, expanding on member request. Its own open/closed state lives in
 * `InterfaceContext.openPanelIds` under the fixed `steward-workspace` id
 * (the same id the backend's `open_panel`/`close_panel` tools are scoped
 * to), so the AI Steward, the collapsed pill's own click target, and any
 * future entry point all agree on one source of truth.
 *
 * This is the single floating Steward surface for the whole app — when
 * voice is live, its orb, status, and controls render inside this same
 * component rather than as a second floating widget (`PersistentVoicePresence`,
 * DOMAIN-005, is deliberately not also mounted): "compose into one unified
 * Steward surface... never two competing floating widgets."
 */
export function StewardWorkspace() {
  const { interfaceState, openPanel, closePanel } = useInterfaceState();
  const voice = useVoice();
  const isExpanded = interfaceState.openPanelIds.includes(STEWARD_PANEL_ID);
  // C2 — V1 Scope Lockdown: voice is cut for V1 entirely, so this never
  // shows live voice UI regardless of turnState, even though the backend
  // already makes a live turnState unreachable (defense in depth).
  const isVoiceLive = V1_FEATURE_FLAGS.voice && LIVE_VOICE_STATES.has(voice.state.turnState);

  if (!isExpanded) {
    return (
      <button type="button" className={styles.collapsed} onClick={() => openPanel(STEWARD_PANEL_ID)}>
        {isVoiceLive ? (
          <>
            <span className={styles.orb}>
              <VoiceOrb turnState={voice.state.turnState} />
            </span>
            <VoiceStateLabel turnState={voice.state.turnState} />
          </>
        ) : (
          <span>Steward</span>
        )}
        <VisuallyHidden>Open the Steward Workspace</VisuallyHidden>
      </button>
    );
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="Steward Workspace">
      <div className={styles.header}>
        <h2 className={styles.title}>Steward Workspace</h2>
        <button type="button" className={styles.closeButton} onClick={() => closePanel(STEWARD_PANEL_ID)}>
          Close
          <VisuallyHidden>Close the Steward Workspace</VisuallyHidden>
        </button>
      </div>

      {isVoiceLive ? (
        <div className={styles.voiceSection}>
          <span className={styles.orb}>
            <VoiceOrb turnState={voice.state.turnState} />
          </span>
          <VoiceStateLabel turnState={voice.state.turnState} />
          <VoiceControls
            turnState={voice.state.turnState}
            muted={voice.state.muted}
            onToggleMute={() => voice.setMuted(!voice.state.muted)}
            onInterrupt={voice.interrupt}
            onEnd={() => void voice.endSession()}
          />
        </div>
      ) : null}

      <RecentConversationPreview />
      <NeedsYourDecision />
    </div>
  );
}
