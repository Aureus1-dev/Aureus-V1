/**
 * Mirrors the backend's password rule (`RegisterDto`/`ResetPasswordDto`:
 * min 10 characters, at least one letter and one number) so members get
 * immediate feedback instead of a round-trip 400. The backend remains
 * the sole enforcement point — this is a UX convenience only.
 */
export function passwordRequirementError(password: string): string | null {
  if (password.length < 10) {
    return 'Password must be at least 10 characters.';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters.';
  }
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}
