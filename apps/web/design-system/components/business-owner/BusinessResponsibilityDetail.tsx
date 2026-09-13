'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  cancelBusinessResponsibility,
  confirmBusinessResponsibilityCompletion,
  getBusinessResponsibilityEvidence,
  markBusinessResponsibilityNeedsYou,
  resumeBusinessResponsibility,
  type BusinessResponsibilityDto,
  type BusinessResponsibilityEvidenceReceipt,
} from '../../../lib/api/business-responsibilities';
import { useSession } from '../../../state';
import type { OwnerCapabilities } from './owner-capabilities';
import { describeCompletion, describeEvidencePresence, statusLabel } from './responsibility-language';
import styles from './BusinessResponsibilityDetail.module.css';

interface Props {
  organizationId: string;
  responsibilityId: string;
  capabilities: OwnerCapabilities;
  onClose: () => void;
  onChanged: (updated: BusinessResponsibilityDto) => void;
}

type DetailState = 'loading' | 'ready' | 'working' | 'error';

const OPEN_STATUSES = new Set(['ACTIVE', 'WAITING_ON_AUREUS', 'WAITING_ON_THIRD_PARTY']);

/**
 * Step 5 — one Responsibility, in full.
 *
 * Everything shown here comes from the canonical Step 4 evidence receipt
 * (`GET /organizations/:id/responsibilities/:id/evidence`). Evidence is never
 * reconstructed from notification copy or conversational text, and completion
 * language is produced by `describeCompletion` so a REPORTED receipt can never
 * be spoken as verified.
 */
export function BusinessResponsibilityDetail({
  organizationId,
  responsibilityId,
  capabilities,
  onClose,
  onChanged,
}: Props) {
  const { session } = useSession();
  const [receipt, setReceipt] = useState<BusinessResponsibilityEvidenceReceipt | null>(null);
  const [state, setState] = useState<DetailState>('loading');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    setState('loading');
    setActionError('');
    try {
      setReceipt(
        await getBusinessResponsibilityEvidence(
          session.accessToken,
          organizationId,
          responsibilityId,
        ),
      );
      setState('ready');
    } catch {
      setReceipt(null);
      setState('error');
    }
  }, [session.accessToken, organizationId, responsibilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (
    action: (token: string, org: string, id: string) => Promise<BusinessResponsibilityDto>,
  ) => {
    if (!session.accessToken) return;
    setState('working');
    setActionError('');
    try {
      const updated = await action(session.accessToken, organizationId, responsibilityId);
      onChanged(updated);
      await load();
    } catch {
      // The server refused or failed. Show that plainly; never assume the
      // change landed and never mutate local state to look successful.
      setActionError('That action did not complete. Nothing was changed.');
      setState('ready');
    }
  };

  if (state === 'loading') {
    return (
      <aside className={styles.panel} aria-live="polite">
        <p className={styles.muted}>Loading this responsibility…</p>
      </aside>
    );
  }

  if (state === 'error' || !receipt) {
    return (
      <aside className={styles.panel}>
        <p className={styles.failure} role="alert">
          Aureus could not load the record for this work. Nothing is shown rather than showing
          something unconfirmed.
        </p>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Close
        </button>
      </aside>
    );
  }

  const outcome = describeCompletion(receipt);
  const isOpen = OPEN_STATUSES.has(receipt.status) || receipt.status === 'WAITING_ON_USER';
  const isTerminal = !isOpen && receipt.status !== 'BLOCKED';

  return (
    <aside className={styles.panel} aria-labelledby="responsibility-detail-heading">
      <header className={styles.header}>
        <h2 id="responsibility-detail-heading" className={styles.title}>
          {receipt.objective}
        </h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          Close
        </button>
      </header>

      <dl className={styles.facts}>
        {receipt.promise ? (
          <>
            <dt>Aureus promised</dt>
            <dd>{receipt.promise}</dd>
          </>
        ) : null}
        {receipt.criterion ? (
          <>
            <dt>Done means</dt>
            <dd>{receipt.criterion}</dd>
          </>
        ) : null}
        <dt>Right now</dt>
        <dd>{statusLabel(receipt.status)}</dd>
        {receipt.dueAt ? (
          <>
            <dt>Due</dt>
            <dd>{new Date(receipt.dueAt).toLocaleDateString()}</dd>
          </>
        ) : null}
        {receipt.completedAt ? (
          <>
            <dt>Finished</dt>
            <dd>{new Date(receipt.completedAt).toLocaleDateString()}</dd>
          </>
        ) : null}
      </dl>

      <section className={styles.evidence} aria-labelledby="evidence-heading">
        <h3 id="evidence-heading" className={styles.sectionHeading}>
          Evidence
        </h3>
        {isTerminal ? (
          <p className={outcome.verified ? styles.verified : styles.reported}>
            <strong>{outcome.headline}</strong> {outcome.detail}
          </p>
        ) : (
          <p className={styles.muted}>{describeEvidencePresence(receipt.lifecycle)}</p>
        )}
      </section>

      <section className={styles.history} aria-labelledby="history-heading">
        <h3 id="history-heading" className={styles.sectionHeading}>
          What happened
        </h3>
        {receipt.lifecycle.length === 0 ? (
          <p className={styles.muted}>Nothing has been recorded yet.</p>
        ) : (
          <ol className={styles.timeline}>
            {receipt.lifecycle.map((event) => (
              <li key={event.eventId} className={styles.timelineItem}>
                <span className={styles.when}>
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
                <span className={styles.what}>{describeEvent(event)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {actionError ? (
        <p className={styles.failure} role="alert">
          {actionError}
        </p>
      ) : null}

      {/*
        Only actions the caller's organization role may actually perform are
        offered. The server re-checks every one of these; hiding them simply
        avoids presenting an action that would be refused.
      */}
      <div className={styles.actions}>
        {capabilities.canChangeWorkState && receipt.status !== 'WAITING_ON_USER' && !isTerminal ? (
          <button
            type="button"
            className={styles.secondary}
            disabled={state === 'working'}
            onClick={() => void run(markBusinessResponsibilityNeedsYou)}
          >
            Flag as needing the business
          </button>
        ) : null}

        {capabilities.canChangeWorkState && receipt.status === 'WAITING_ON_USER' ? (
          <button
            type="button"
            className={styles.secondary}
            disabled={state === 'working'}
            onClick={() => void run(resumeBusinessResponsibility)}
          >
            Hand back to Aureus
          </button>
        ) : null}

        {capabilities.canManageCompletion && !isTerminal ? (
          <>
            <button
              type="button"
              className={styles.primary}
              disabled={state === 'working'}
              onClick={() => void run(confirmBusinessResponsibilityCompletion)}
            >
              Confirm this is done
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={state === 'working'}
              onClick={() => void run(cancelBusinessResponsibility)}
            >
              Cancel this work
            </button>
          </>
        ) : null}
      </div>

      {capabilities.canManageCompletion && !isTerminal ? (
        <p className={styles.caution}>
          Confirming records your attestation that this happened. It is stored as a reported
          result, not an independent verification.
        </p>
      ) : null}
    </aside>
  );
}

/** Lifecycle events in plain language. Internal enum names never reach the owner. */
function describeEvent(event: {
  type: string;
  actorClass: string;
  toStatus: string | null;
  sourceState: string | null;
  evidenceLevel: string | null;
}): string {
  switch (event.type) {
    case 'ACCEPTED':
      return 'Aureus accepted this work.';
    case 'USER_INPUT_REQUIRED':
      return 'Aureus asked the business for something.';
    case 'EXTERNAL_WAIT_STARTED':
      return 'Waiting on someone outside the business.';
    case 'COMMITMENT_RECORDED':
      return 'A commitment was recorded.';
    case 'ACTION_EVIDENCED':
      return event.evidenceLevel === 'VERIFIED'
        ? 'Verified evidence was recorded.'
        : 'A result was reported.';
    case 'COMPLETED':
      return 'Marked complete.';
    case 'RESPONSIBLY_EXHAUSTED':
      return 'Aureus stopped — no further permitted step remained.';
    case 'CANCELLED':
      return 'Cancelled.';
    case 'STATE_CHANGED':
      return event.toStatus ? `Now: ${statusLabel(event.toStatus as never)}` : 'State changed.';
    default:
      return 'Activity recorded.';
  }
}
