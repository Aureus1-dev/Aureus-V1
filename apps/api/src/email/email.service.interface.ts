export const EMAIL_SERVICE = 'EMAIL_SERVICE';

/**
 * Transactional email delivery for the two flows that need it (ADR-005 §7 /
 * ADR-009): account email verification and password reset. Deliberately
 * narrow rather than a generic `send(to, subject, body)` — every email this
 * platform sends today is one of these two templated notifications, and a
 * generic API would just push templating responsibility onto every caller.
 */
export interface IEmailService {
  /** Sends the account-verification email containing a link built from the opaque token. */
  sendEmailVerification(to: string, token: string): Promise<void>;

  /** Sends the password-reset email containing a link built from the opaque token. */
  sendPasswordReset(to: string, token: string): Promise<void>;
}
