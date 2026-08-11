'use client';

import { useEffect, useRef } from 'react';
import { useConversation, useSession, useVoice } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
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
 * The Voice Domain surface. Voice and text share one canonical conversation.
 * The persistent Living Hall is the visual presence; voice does not introduce
 * a second mascot, orb, avatar, or glowing object that competes with the room.
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
        // Autoplay may be blocked until further user interaction. The member
        // already chose to start voice, so the controls remain available and
        // no fake success state is shown.
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
