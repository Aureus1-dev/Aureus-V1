import type { ConversationErrorKind } from '../../../state';

/**
 * Calm, respectful, action-oriented recovery language (FPB-014 §3, §8).
 * Centralized so every surface that shows a conversation error speaks
 * with one voice rather than leaking transport-layer text to members.
 */
export function conversationErrorCopy(kind: ConversationErrorKind): {
  title: string;
  description: string;
} {
  switch (kind) {
    case 'authentication':
      return {
        title: 'Sign in to continue',
        description: "You'll need to sign in again to continue this conversation.",
      };
    case 'rate-limited':
      return {
        title: "Let's slow down for a moment",
        description: "You're sending messages a little quickly. Please wait a moment, then try again.",
      };
    case 'unavailable':
      return {
        title: 'Your steward is temporarily unavailable',
        description: 'Your message has been kept safe. Please try again in a moment.',
      };
    case 'validation':
      return {
        title: "That message couldn't be sent",
        description: 'Please adjust your message and try sending it again.',
      };
    case 'network':
      return {
        title: 'Connection interrupted',
        description: 'It looks like your connection was interrupted. Your message has been kept safe.',
      };
    default:
      return {
        title: 'Something went wrong',
        description: 'Your message has been kept safe. Please try again in a moment.',
      };
  }
}
