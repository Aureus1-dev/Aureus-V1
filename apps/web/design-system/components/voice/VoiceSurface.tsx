'use client';

import { useEffect, useRef } from 'react';
import { useConversation, useSession, useVoice } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VoiceOrb } from './VoiceOrb';
import { VoiceStateLabel } from './VoiceStateLabel';
import { LiveTranscript } from './LiveTranscript';
import { VoiceControls } from './VoiceControls';
import { voiceErrorCopy } from './voice-error-copy';
import styles from './VoiceSurface.module.css';

export interface VoiceSurfaceProps {
  /** An existing text conversation to continue by voice. Omit to start a new one. */
  conversationId?: string;
  onClose?: () => void;
}

/**
 * The Voice Domain surface (AFX-003, DOMAIN-003). Voice and text share
 * one canonical conversation (DOMAIN-002) — this component only ever
 * attaches to `conversationId`, and on close, refreshes the text
 * surface's message cache so the two views stay in sync (text ↔ voice
 * continuity).
 */
export function VoiceSurface({ conversationId, onClose }: VoiceSurfaceProps) {
  const { session } = useSession();
  const { state, remoteStream, startSession, endSession, setMuted, interrupt, clearError } = useVoice();
  const { refreshMessages } = useConversation();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      void audioRef.current.play().catch(() => {
        // Autoplay may be blocked until further user interaction; the
        // member has already taken an explicit action to start this
        // session, so no further prompt is needed here.
      });
    }
  }, [remoteStream]);

  async function handleEnd() {
    await endSession();
    if (state.conversationId) {
      void refreshMessages(state.conversationId);
    }
  }

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to talk with your steward"
        description="Voice conversation is available once you're signed in."
      />
    );
  }

  const errorCopy = state.error ? voiceErrorCopy(state.error.kind) : null;

  return (
    <div className={styles.surface}>
      <audio ref={audioRef} autoPlay />

      {errorCopy ? (
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          action={
            state.error?.retryable ? (
              <Button variant="secondary" onClick={() => void startSession(conversationId)}>
                Try again
              </Button>
            ) : (
              <Button variant="secondary" onClick={clearError}>
                Dismiss
              </Button>
            )
          }
        />
      ) : state.turnState === 'idle' ? (
        <EmptyState
          title="Talk with your steward"
          description="Your steward will listen, respond aloud, and never rush you. Microphone access begins only after you start."
          action={
            <Button variant="primary" onClick={() => void startSession(conversationId)}>
              Start voice conversation
            </Button>
          }
        />
      ) : state.turnState === 'ended' ? (
        <EmptyState
          title="Conversation ended"
          description="Your conversation has been saved."
          action={
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          }
        />
      ) : (
        <>
          <VoiceOrb turnState={state.turnState} />
          <VoiceStateLabel turnState={state.turnState} />
          <LiveTranscript entries={state.transcript} />
          <VoiceControls
            turnState={state.turnState}
            muted={state.muted}
            onToggleMute={() => setMuted(!state.muted)}
            onInterrupt={interrupt}
            onEnd={() => void handleEnd()}
          />
        </>
      )}
    </div>
  );
}
