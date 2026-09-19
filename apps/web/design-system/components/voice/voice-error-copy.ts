import type { VoiceErrorKind } from '../../../state';

/**
 * Calm, respectful, action-oriented recovery language (FPB-014 §3, §8),
 * mirroring `conversation-error-copy.ts` for the Voice Domain's own
 * error vocabulary.
 */
export function voiceErrorCopy(kind: VoiceErrorKind): { title: string; description: string } {
  switch (kind) {
    case 'authentication':
      return {
        title: 'Sign in to continue',
        description:
          "You'll need to sign in again to start a voice conversation. You can keep typing here in the meantime.",
      };
    case 'permission-denied':
      return {
        title: 'Microphone access is needed',
        description:
          'Allow microphone access in your browser and try voice again, or continue by typing. Nothing you already shared was lost.',
      };
    case 'connection':
      return {
        title: 'The voice connection was interrupted',
        description:
          'Nothing you already shared was lost. You can try voice again or continue the same conversation by typing.',
      };
    case 'unavailable':
      return {
        title: 'Voice is temporarily unavailable',
        description:
          'Nothing you already shared was lost. Try voice again, or continue the same conversation by typing.',
      };
    case 'network':
      return {
        title: 'Connection interrupted',
        description:
          'Your connection was interrupted. Nothing you already shared was lost; try voice again or continue by typing.',
      };
    default:
      return {
        title: 'Voice could not start',
        description:
          'Nothing you already shared was lost. Try voice again, or continue the same conversation by typing.',
      };
  }
}
