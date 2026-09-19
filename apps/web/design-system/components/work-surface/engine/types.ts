/**
 * Aureus Work Surface — Slice 0 prototype types.
 *
 * Every type in this module describes PROTOTYPE FIXTURE data or
 * PROTOTYPE FIXTURE-driven UI state — deterministic, scripted, local to
 * this isolated route. None of it is wired to real orchestration,
 * real member accounts (beyond the genuine guest/claim session calls
 * documented where they occur), or a real backend "work" engine. See
 * `docs/100-experience/AUREUS-WORK-SURFACE-REVIEW-ADDENDUM.md` §3.4:
 * "The visible work trace must be driven by actual orchestration/task
 * events, not timers or decorative animation" — that is a *production*
 * requirement for Slice 2+. Slice 0 explicitly simulates it with fixture
 * timelines so the shape of the UI can be reviewed before real events
 * exist, and every fixture surface here says so.
 */

/** A public stewardship story shown at ordinary arrival (portfolio §14). */
export interface StewardshipStory {
  id: string;
  title: string;
  situation: string;
  carried: string[];
  result: string;
  category: 'people' | 'family' | 'business';
}

/** One step of "Now" — a single, human-readable, action-level status line. */
export interface WorkStep {
  id: string;
  label: string;
  /** How long this step's status line stays on screen before advancing. */
  holdMs: number;
}

export type CarryingItemStatus = 'queued' | 'working' | 'completed' | 'needs-you' | 'blocked';

export interface CarryingItem {
  id: string;
  label: string;
  status: CarryingItemStatus;
  detail?: string;
}

export interface NeedsYouItem {
  id: string;
  prompt: string;
  actionLabel: string;
}

export interface FoundItem {
  id: string;
  label: string;
}

/** A durable, nameable result/artifact object — never buried in the transcript. */
export interface ResultArtifact {
  id: string;
  name: string;
  status: string;
  currentness: string;
  relatedMatter: string;
  evidence: string[];
  whatRemains: string | null;
  doneMeans: string;
}

/** A single scripted matter (Slice 0 fixture "work" — see file-level note). */
export interface MatterScript {
  id: string;
  workingOn: string;
  steps: WorkStep[];
  carrying: CarryingItem[];
  /** Revealed once the scripted step reaches the matching index. */
  needsYouAt: number;
  needsYou: NeedsYouItem | null;
  foundAt: number;
  found: FoundItem[];
  artifactAt: number;
  artifact: ResultArtifact;
  doneMeans: string;
}

export type CarryReasonId =
  | 'continue-later'
  | 'reminder'
  | 'monitoring'
  | 'documents'
  | 'connected-account'
  | 'continuity-warning';

export interface CarryReason {
  id: CarryReasonId;
  /** Plain-language explanation of *why* continuity requires an account (portfolio §3). */
  why: string;
}

export type ArrivalMode = 'ordinary' | 'urgent';

export type PrototypeView =
  | { kind: 'arrival'; mode: ArrivalMode }
  | { kind: 'understanding'; mode: ArrivalMode }
  | { kind: 'active-work'; matterId: string }
  | { kind: 'returning-one'; matterId: string }
  | { kind: 'returning-several' }
  | { kind: 'returning-none' }
  | { kind: 'error' };

export interface TranscriptMessage {
  id: string;
  author: 'member' | 'aureus';
  text: string;
  attachments: string[];
}

export type CarryBoundaryStatus = 'idle' | 'intent-prompt' | 'panel' | 'declined-recently';

export interface CarryBoundaryState {
  status: CarryBoundaryStatus;
  reason: CarryReason | null;
}

export type ClaimStatus = 'idle' | 'pending' | 'success' | 'error';

export type ScenarioId =
  'arrival' | 'urgent' | 'returning-one' | 'returning-several' | 'returning-none' | 'error';
