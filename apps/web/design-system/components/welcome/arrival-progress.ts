/**
 * B6 (Gate B — The Gate): persists which step of the guided first-run
 * flow a member has reached, so a reload (or an unrelated redirect back
 * to `/welcome`) resumes exactly where they left off instead of losing
 * progress or repeating completed steps. Device-scoped (localStorage),
 * not account-scoped — consistent with the rest of this flow (consent
 * and preferences are similarly not synced across devices for one
 * member); a fresh sign-in on a different device simply starts fresh.
 */
export type ArrivalStep =
  | 'consent'
  | 'preferences'
  | 'hospitality'
  | 'immediate-need'
  | 'first-mission'
  | 'opportunities'
  | 'review-approval'
  | 'next-step';

const STORAGE_KEY = 'aureus.arrival.step';

export function readArrivalStep(): ArrivalStep | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY) as ArrivalStep | null;
}

export function writeArrivalStep(step: ArrivalStep): void {
  window.localStorage.setItem(STORAGE_KEY, step);
}

/** Called once the guided flow reaches its final screen — there is nothing left to resume. */
export function clearArrivalStep(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
