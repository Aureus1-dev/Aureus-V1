'use client';

import { useEffect, useState } from 'react';
import { useCitySheet } from '../../../state';
import type {
  ChecklistResponseInput, CitySheetVerificationConfidence, CitySheetVerificationStatus,
} from '../../../lib/api/city-sheet';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import styles from './CitySheetVerificationPanel.module.css';

const STATUS_OPTIONS: CitySheetVerificationStatus[] = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED'];
const CONFIDENCE_OPTIONS: CitySheetVerificationConfidence[] = ['HIGH', 'MEDIUM', 'LOW'];

/**
 * A4 engineering — the Human Steward Verification Workflow, built into the
 * application (rather than raw API calls) so a Human Steward can complete
 * A4's real phone/contact verification of every candidate referral. This
 * component never verifies, rejects, or fabricates anything on its own —
 * every checklist answer, confidence level, and note here is entered by
 * whoever is actually using it; the component only carries that person's
 * own decision to the backend, which remains the sole place a
 * `verificationStatus` actually changes.
 */
export function CitySheetVerificationPanel() {
  const { state, loadQueue, selectEntry, clearSelection, verify, reject, flagForReview, clearError } = useCitySheet();
  const [statusFilter, setStatusFilter] = useState<CitySheetVerificationStatus>('UNVERIFIED');
  const [confidence, setConfidence] = useState<CitySheetVerificationConfidence>('HIGH');
  const [notes, setNotes] = useState('');
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadQueue(statusFilter);
  }, [loadQueue, statusFilter]);

  const selected = state.entries.find((entry) => entry.id === state.selectedEntryId) ?? null;

  function openEntry(id: string) {
    setNotes('');
    setChecklistAnswers({});
    setConfidence('HIGH');
    void selectEntry(id);
  }

  function closeEntry() {
    clearSelection();
  }

  function buildChecklistResponses(): ChecklistResponseInput[] | undefined {
    if (!state.guide || state.guide.checklist.length === 0) return undefined;
    return state.guide.checklist.map((item) => ({
      itemId: item.id,
      label: item.label,
      confirmed: Boolean(checklistAnswers[item.id]),
    }));
  }

  async function confirmVerify() {
    if (!selected) return;
    await verify(selected.id, {
      confidence,
      verificationNotes: notes.trim() || undefined,
      checklistResponses: buildChecklistResponses(),
    });
  }

  async function confirmReject() {
    if (!selected) return;
    await reject(selected.id, {
      reason: notes.trim(),
      confidence,
      checklistResponses: buildChecklistResponses(),
    });
  }

  async function confirmFlag() {
    if (!selected) return;
    await flagForReview(selected.id, { reason: notes.trim(), confidence });
  }

  if (state.isLoadingQueue && state.entries.length === 0) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Loading the city sheet verification queue" />
      </div>
    );
  }

  if (state.error && state.entries.length === 0) {
    return (
      <ErrorState
        title="The verification queue couldn't be loaded"
        description={state.error.message}
        action={state.error.retryable ? <Button onClick={() => void loadQueue(statusFilter)}>Try again</Button> : undefined}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>City Sheet Verification</h1>
      <p className={styles.intro}>
        Human-verify every referral (A4). Call each organization, confirm the checklist, and record what you found —
        nothing here is verified until you say so.
      </p>

      {state.error ? (
        <div className={styles.inlineError}>
          <ErrorState
            title="Something went wrong"
            description={state.error.message}
            action={<Button variant="secondary" onClick={clearError}>Dismiss</Button>}
          />
        </div>
      ) : null}

      <div className={styles.filterRow}>
        <label className={styles.filterLabel} htmlFor="city-sheet-status-filter">
          Status
        </label>
        <select
          id="city-sheet-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as CitySheetVerificationStatus)}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {state.entries.length === 0 ? (
        <EmptyState title="Nothing here" description={`No entries currently have status ${statusFilter}.`} />
      ) : (
        <ul className={styles.list}>
          {state.entries.map((entry) => {
            const isOpen = state.selectedEntryId === entry.id;
            const isSubmitting = state.submittingId === entry.id;
            return (
              <li key={entry.id}>
                <Card className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.ref}>{entry.citySheetRef ?? entry.id}</span>
                    <span className={styles.itemTitle}>{entry.organizationName}</span>
                    <span className={styles.categoryBadge}>{entry.category.replaceAll('_', ' ')}</span>
                  </div>
                  <p className={styles.itemMeta}>{entry.serviceArea}</p>

                  {isOpen ? (
                    <Button type="button" variant="secondary" onClick={closeEntry}>
                      Close
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => openEntry(entry.id)}>
                      Review
                    </Button>
                  )}

                  {isOpen ? (
                    state.isLoadingDetail ? (
                      <LoadingState label="Loading verification guide" />
                    ) : state.guide ? (
                      <div className={styles.detail}>
                        <dl className={styles.facts}>
                          <dt>Phone</dt><dd>{entry.phone ?? 'Not on file'}</dd>
                          <dt>Address</dt><dd>{entry.address ?? 'Not on file'}</dd>
                          <dt>Hours (on file)</dt><dd>{entry.hours}</dd>
                          <dt>Website</dt><dd>{entry.website ?? 'Not on file'}</dd>
                        </dl>

                        <h2 className={styles.subheading}>Call script</h2>
                        <p className={styles.callScript}>{state.guide.callScript}</p>

                        {state.guide.checklist.length > 0 ? (
                          <fieldset className={styles.checklist}>
                            <legend className={styles.subheading}>Checklist</legend>
                            {state.guide.checklist.map((item) => (
                              <label key={item.id} className={styles.checklistItem}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(checklistAnswers[item.id])}
                                  onChange={(event) =>
                                    setChecklistAnswers((previous) => ({ ...previous, [item.id]: event.target.checked }))
                                  }
                                />
                                {item.label}
                              </label>
                            ))}
                          </fieldset>
                        ) : null}

                        <div className={styles.formRow}>
                          <label className={styles.filterLabel} htmlFor={`confidence-${entry.id}`}>
                            Confidence
                          </label>
                          <select
                            id={`confidence-${entry.id}`}
                            value={confidence}
                            onChange={(event) => setConfidence(event.target.value as CitySheetVerificationConfidence)}
                          >
                            {CONFIDENCE_OPTIONS.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </div>

                        <label className={styles.filterLabel} htmlFor={`notes-${entry.id}`}>
                          Notes (required to reject or flag for review)
                        </label>
                        <textarea
                          id={`notes-${entry.id}`}
                          className={styles.notesInput}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="What you confirmed on the call, or why this candidate is being rejected..."
                        />

                        <div className={styles.actions}>
                          <Button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void confirmVerify()}
                          >
                            {isSubmitting ? 'Verifying…' : 'Verify'}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isSubmitting || notes.trim().length < 3}
                            onClick={() => void confirmReject()}
                          >
                            {isSubmitting ? 'Rejecting…' : 'Reject'}
                          </Button>
                          {entry.verificationStatus === 'VERIFIED' ? (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isSubmitting || notes.trim().length < 3}
                              onClick={() => void confirmFlag()}
                            >
                              {isSubmitting ? 'Flagging…' : 'Flag for review'}
                            </Button>
                          ) : null}
                        </div>

                        {state.history.length > 0 ? (
                          <details className={styles.history}>
                            <summary>Verification history ({state.history.length})</summary>
                            <ul>
                              {state.history.map((event) => (
                                <li key={event.id}>
                                  <strong>{event.eventType}</strong> — {event.previousStatus} → {event.newStatus}
                                  {event.confidence ? ` (${event.confidence} confidence)` : ''}
                                  {' — '}
                                  {new Date(event.performedAt).toLocaleString()}
                                  {event.notes ? <p className={styles.historyNote}>{event.notes}</p> : null}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    ) : null
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
