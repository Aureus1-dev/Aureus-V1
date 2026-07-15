export const EMAIL_SERVICE = 'EMAIL_SERVICE';

/**
 * Transactional email delivery. `sendEmailVerification`/`sendPasswordReset`
 * (ADR-005 §7 / ADR-009) remain templated, use-case-shaped methods for Auth's
 * two flows. `sendNotification` is the generic primitive ADR-009's Future
 * Extension Points anticipated ("a generic send() primitive if a second,
 * materially different email use case appears") — the Communication System
 * (ADR-012) is that second use case: it owns its own subject/body templating
 * per notification category, so this method stays a thin transport call.
 */
export interface IEmailService {
  /** Sends the account-verification email containing a link built from the opaque token. */
  sendEmailVerification(to: string, token: string): Promise<void>;

  /** Sends the password-reset email containing a link built from the opaque token. */
  sendPasswordReset(to: string, token: string): Promise<void>;

  /** Sends a generic, caller-templated transactional notification email. */
  sendNotification(to: string, subject: string, body: string): Promise<void>;
}
