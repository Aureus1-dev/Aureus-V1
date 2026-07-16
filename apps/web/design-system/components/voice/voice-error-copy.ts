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
        description: "You'll need to sign in again to start a voice conversation.",
      };
    case 'permission-denied':
      return {
        title: 'Microphone access is needed',
        description: 'Please allow microphone access in your browser to talk with your steward, then try again.',
      };
    case 'connection':
      return {
        title: 'The voice connection was interrupted',
        description: 'Your conversation history has been kept safe. Please try starting again.',
      };
    case 'unavailable':
      return {
        title: 'Voice is temporarily unavailable',
        description: 'Please try again in a moment, or continue by typing instead.',
      };
    case 'network':
      return {
        title: 'Connection interrupted',
        description: 'It looks like your connection was interrupted. Please try again.',
      };
    default:
      return {
        title: 'Something went wrong',
        description: 'Please try again in a moment, or continue by typing instead.',
      };
  }
}
