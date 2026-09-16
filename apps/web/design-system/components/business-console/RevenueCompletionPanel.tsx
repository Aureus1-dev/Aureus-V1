'use client';

import { useMemo, useState } from 'react';
import {
  recordRevenueMilestone,
  type RevenueCompletionProjection,
  type RevenueCompletionStage,
  type RevenueDecision,
} from '../../../lib/api/business-operations';
import styles from './BusinessOperationsPanel.module.css';

const ACTION_LABEL: Record<RevenueCompletionStage, string> = {
  READY_PROJECT_VALIDATED: 'Record expert validation',
  PROPOSAL_RECORDED: 'Record proposal',
  FOLLOW_UP_RECORDED: 'Record follow-up',
  DECISION_RECORDED: 'Record customer decision',
  CONTRACT_RECORDED: 'Record contract boundary',
  DEPOSIT_RECORDED: 'Record deposit report',
  OPERATIONS_HANDOFF_RECORDED: 'Record operations handoff',
};

interface RevenueCompletionPanelProps {
  accessToken: string;
  tenantId: string;
  leadId: string;
  projection: RevenueCompletionProjection;
  onChanged: () => Promise<void>;
}

export function RevenueCompletionPanel({
  accessToken,
  tenantId,
  leadId,
  projection,
  onChanged,
}: RevenueCompletionPanelProps) {
  const [stage, setStage] = useState<RevenueCompletionStage | ''>(
    projection.availableActions[0] ?? '',
  );
  const [evidenceReference, setEvidenceReference] = useState('');
  const [decision, setDecision] = useState<RevenueDecision>('ACCEPTED');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const selectedStage = useMemo(() => {
    if (stage && projection.availableActions.includes(stage)) return stage;
    return projection.availableActions[0] ?? '';
  }, [projection.availableActions, stage]);

  const submit = async () => {
    if (!selectedStage || !evidenceReference.trim()) return;
    setWorking(true);
    setFailed(false);
    setMessage('');
    try {
      await recordRevenueMilestone(accessToken, tenantId, leadId, {
        stage: selectedStage,
        requestKey: crypto.randomUUID(),
        evidenceReference: evidenceReference.trim(),
        ...(selectedStage === 'DECISION_RECORDED' ? { decision } : {}),
      });
      setEvidenceReference('');
      setMessage('Reported milestone recorded.');
      await onChanged();
    } catch {
      // A failed response does not prove whether the server committed before
      // the connection failed. Never tell the operator that nothing changed.
      setFailed(true);
      setMessage(
        'Aureus could not confirm whether that revenue update completed. Refresh this handoff before trying again.',
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="revenue-completion-title">
      <p className={styles.eyebrow}>Step 6 · Revenue completion</p>
      <h4 id="revenue-completion-title">From Ready Project to operations handoff</h4>
      <p className={styles.subtle}>{projection.evidenceNotice}</p>
      <p>
        <strong>Current reported stage:</strong>{' '}
        {projection.currentStage?.replaceAll('_', ' ') ?? 'Not started'}
      </p>
      <p>
        <strong>Next:</strong> {projection.nextRequiredAction}
      </p>

      <div className={styles.metricGrid} aria-label="Economic Stewardship evidence">
        <div className={styles.metric}>
          <strong>{projection.economicStewardship.earn.status}</strong>
          <span>Earn · proposal value not ingested</span>
        </div>
        <div className={styles.metric}>
          <strong>{projection.economicStewardship.convert.status}</strong>
          <span>Convert · reported sales progress</span>
        </div>
        <div className={styles.metric}>
          <strong>{projection.economicStewardship.keep.status}</strong>
          <span>Keep · margin not established</span>
        </div>
        <div className={styles.metric}>
          <strong>{projection.economicStewardship.compound.status}</strong>
          <span>Compound · no repeat/referral source</span>
        </div>
      </div>

      <details>
        <summary>Why these numbers stop here</summary>
        <ul className={styles.queue}>
          <li>{projection.economicStewardship.earn.basis}</li>
          <li>{projection.economicStewardship.convert.basis}</li>
          <li>{projection.economicStewardship.keep.basis}</li>
          <li>{projection.economicStewardship.compound.basis}</li>
        </ul>
      </details>

      <h5>Reported milestone ledger</h5>
      {projection.milestones.length === 0 ? (
        <p className={styles.subtle}>No revenue milestone has been reported yet.</p>
      ) : (
        <ol className={styles.queue}>
          {projection.milestones.map((milestone) => (
            <li key={milestone.eventId}>
              <strong>{milestone.stage.replaceAll('_', ' ')}</strong> · REPORTED
              {milestone.decision ? ` · ${milestone.decision.replaceAll('_', ' ')}` : ''}
              <br />
              <small>
                Evidence ref {milestone.evidenceReference} ·{' '}
                {new Date(milestone.occurredAt).toLocaleString()}
              </small>
            </li>
          ))}
        </ol>
      )}

      {projection.availableActions.length > 0 ? (
        <div className={styles.actions} aria-label="Revenue completion actions">
          <label>
            Next reported milestone{' '}
            <select
              value={selectedStage}
              onChange={(event) => setStage(event.target.value as RevenueCompletionStage)}
              disabled={working}
            >
              {projection.availableActions.map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABEL[action]}
                </option>
              ))}
            </select>
          </label>

          {selectedStage === 'DECISION_RECORDED' ? (
            <label>
              Reported customer decision{' '}
              <select
                value={decision}
                onChange={(event) => setDecision(event.target.value as RevenueDecision)}
                disabled={working}
              >
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="REVISION_REQUESTED">Revision requested</option>
              </select>
            </label>
          ) : null}

          <label>
            Evidence reference{' '}
            <input
              value={evidenceReference}
              onChange={(event) => setEvidenceReference(event.target.value)}
              placeholder="e.g. proposal-1042"
              maxLength={72}
              autoComplete="off"
              disabled={working}
            />
          </label>
          <p className={styles.subtle}>
            Reference IDs only. Do not paste contract text, signatures, payment credentials, card or
            bank data, passwords, or other secrets.
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={working || !selectedStage || !evidenceReference.trim()}
          >
            {selectedStage ? ACTION_LABEL[selectedStage] : 'Record milestone'}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className={failed ? styles.error : styles.subtle} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}

      <p className={styles.subtle}>
        This surface records what authorized humans or external systems report. Aureus does not sign
        contracts, move money, or promise construction scheduling in this slice.
      </p>
    </section>
  );
}
