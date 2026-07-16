export type DomainErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

/**
 * Shared calm, respectful, action-oriented recovery language (FPB-014
 * §3, §8) for the Journey/Opportunities/Recommendations state modules —
 * their error `kind` values are structurally identical, so one copy
 * table serves all three rather than duplicating it per module.
 */
export function domainErrorCopy(kind: DomainErrorKind): { title: string; description: string } {
  switch (kind) {
    case 'authentication':
      return { title: 'Sign in to continue', description: "You'll need to sign in again to continue." };
    case 'rate-limited':
      return {
        title: "Let's slow down for a moment",
        description: "You're moving a little quickly. Please wait a moment, then try again.",
      };
    case 'unavailable':
      return {
        title: 'Temporarily unavailable',
        description: 'This is taking longer than expected. Please try again in a moment.',
      };
    case 'validation':
      return { title: "That didn't go through", description: 'Please review and try again.' };
    case 'network':
      return {
        title: 'Connection interrupted',
        description: 'It looks like your connection was interrupted. Please try again.',
      };
    default:
      return { title: 'Something went wrong', description: 'Please try again in a moment.' };
  }
}
