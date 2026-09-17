'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  addLegalMatterDeadline,
  addLegalMatterFact,
  addLegalMatterSource,
  checkLegalAction,
  createLegalMatter,
  getActiveLegalMatter,
  getLegalPreparationPacket,
  reportLegalMatterOutcome,
  requestLegalReview,
  type LegalMatterDto,
  type LegalMatterUrgency,
} from '../../../lib/api/legal-matters';
import { Button } from '../Button/Button';
import styles from './LegalMatterPanel.module.css';

interface Props {
  accessToken: string;
  conversationId: string;
  statedNeedId: string;
  statedNeedContent: string;
}

export const LEGAL_ROLE_DISCLOSURE =
  'Aureus is your Matter Steward, not a lawyer or law firm. Opening this Matter does not create an attorney-client relationship. Aureus can organize the record, retrieve and track sources and dates, prepare questions, and carry permitted administrative work. You keep your legal decisions, and licensed or human judgment is required where law or the situation requires it.';

export function LegalMatterPanel({
  accessToken,
  conversationId,
  statedNeedId,
  statedNeedContent,
}: Props) {
  const [matter, setMatter] = useState<LegalMatterDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [packet, setPacket] =
    useState<Awaited<ReturnType<typeof getLegalPreparationPacket>> | null>(null);

  const [jurisdiction, setJurisdiction] = useState('');
  const [forum, setForum] = useState('');
  const [matterType, setMatterType] = useState('');
  const [posture, setPosture] = useState('');
  const [urgency, setUrgency] = useState<LegalMatterUrgency>('TIME_SENSITIVE');
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceProposition, setSourceProposition] = useState('');
  const [fact, setFact] = useState('');
  const [deadlineLabel, setDeadlineLabel] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [deadlineZone, setDeadlineZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UNSPECIFIED',
  );
  const [deadlineTrigger, setDeadlineTrigger] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getActiveLegalMatter(accessToken, conversationId)
      .then((active) => {
        if (!cancelled) setMatter(active);
      })
      .catch(() => {
        if (!cancelled) setError('Aureus could not load the legal Matter state.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, conversationId]);

  const refresh = async () => {
    const active = await getActiveLegalMatter(accessToken, conversationId);
    setMatter(active);
    return active;
  };

  const openMatter = async (event: FormEvent) => {
    event.preventDefault();
    if (!disclosureAccepted) return;
    setOpening(true);
    setError(null);
    try {
      const created = await createLegalMatter(accessToken, {
        statedNeedId,
        objective: `Carry this legal matter to a truthful outcome: ${statedNeedContent.slice(0, 1200)}`,
        jurisdiction,
        forum: forum || undefined,
        matterType,
        proceduralPosture: posture,
        urgency,
        disclosureAccepted: true,
      });
      setMatter(created);
      setShowOpenForm(false);
      setNotice(
        'Legal Matter opened. Aureus is in safe mode until any jurisdiction-sensitive assistance is separately enabled.',
      );
    } catch {
      setError('Aureus could not open this legal Matter. Nothing was filed, signed, or submitted.');
    } finally {
      setOpening(false);
    }
  };

  if (loading) return null;

  if (!matter) {
    return (
      <section className={styles.card} aria-label="Legal Matter Stewardship">
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Legal / Matter Stewardship</p>
            <h2 className={styles.title}>Does this involve a legal matter?</h2>
          </div>
          <span className={styles.private}>Private by default</span>
        </div>
        <p className={styles.copy}>
          If a court, agency, legal notice, lawyer, deadline, hearing, filing, or legal right is involved,
          Aureus can keep the matter organized and carry the safe surrounding work.
        </p>
        {!showOpenForm ? (
          <Button type="button" variant="secondary" onClick={() => setShowOpenForm(true)}>
            Open a legal Matter
          </Button>
        ) : (
          <form className={styles.form} onSubmit={openMatter}>
            <div className={styles.disclosure}>{LEGAL_ROLE_DISCLOSURE}</div>
            <label className={styles.label}>
              Jurisdiction
              <input
                value={jurisdiction}
                onChange={(event) => setJurisdiction(event.target.value)}
                required
                placeholder="State, territory, federal, or other jurisdiction"
              />
            </label>
            <label className={styles.label}>
              Court / agency / forum, if known
              <input
                value={forum}
                onChange={(event) => setForum(event.target.value)}
                placeholder="You can leave this blank if you do not know yet"
              />
            </label>
            <label className={styles.label}>
              Matter type
              <input
                value={matterType}
                onChange={(event) => setMatterType(event.target.value)}
                required
                placeholder="Housing / eviction, benefits appeal, criminal, family, debt…"
              />
            </label>
            <label className={styles.label}>
              Where things stand
              <textarea
                value={posture}
                onChange={(event) => setPosture(event.target.value)}
                required
                placeholder="Notice received, case filed, hearing scheduled, appeal pending…"
              />
            </label>
            <label className={styles.label}>
              Urgency
              <select
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as LegalMatterUrgency)}
              >
                <option value="ROUTINE">Routine</option>
                <option value="TIME_SENSITIVE">Time-sensitive</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={disclosureAccepted}
                onChange={(event) => setDisclosureAccepted(event.target.checked)}
              />
              I understand Aureus is acting as a steward, not my lawyer or law firm.
            </label>
            <p className={styles.copy}>
        {matter.representationRouting.note}
      </p>

      <div className={styles.actions}>
              <Button type="submit" disabled={opening || !disclosureAccepted}>
                {opening ? 'Opening Matter…' : 'Open Matter'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowOpenForm(false)}>
                Not now
              </Button>
            </div>
          </form>
        )}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>
    );
  }

  const pendingReview = matter.reviewRequests.some((request) => request.status === 'PENDING');

  return (
    <section className={styles.card} aria-label="Legal Matter Stewardship">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Aureus is carrying this legal Matter</p>
          <h2 className={styles.title}>{matter.responsibility.objective}</h2>
        </div>
        <span className={styles.private}>Private by default</span>
      </div>

      <p className={styles.boundary}>{LEGAL_ROLE_DISCLOSURE}</p>
      <dl className={styles.grid}>
        <div><dt>Jurisdiction</dt><dd>{matter.jurisdiction}</dd></div>
        <div><dt>Forum</dt><dd>{matter.forum || 'Not known yet'}</dd></div>
        <div><dt>Posture</dt><dd>{matter.proceduralPosture}</dd></div>
        <div><dt>Urgency</dt><dd>{matter.urgency.replaceAll('_', ' ')}</dd></div>
        <div><dt>Responsibility</dt><dd>{matter.responsibility.status.replaceAll('_', ' ')}</dd></div>
        <div>
          <dt>Assistance mode</dt>
          <dd>{matter.jurisdictionGate.status === 'ENABLED' ? 'Governed expanded mode' : 'Safe mode'}</dd>
        </div>
      </dl>

      {matter.jurisdictionGate.status !== 'ENABLED' ? (
        <p className={styles.safeMode}>
          No governed expanded-assistance policy is active for this jurisdiction and matter type.
          Aureus will organize, retrieve official sources, track reported dates, prepare questions,
          and route qualified help—but will not cross into jurisdiction-sensitive legal work.
        </p>
      ) : null}

      {matter.deadlines.length > 0 ? (
        <div className={styles.section}>
          <h3>Dates we are carrying</h3>
          {matter.deadlines.map((deadline) => (
            <div className={styles.item} key={deadline.id}>
              <strong>{deadline.label}</strong>
              <span>{new Date(deadline.dueAt).toLocaleString()} · {deadline.timeZone}</span>
              <span>
                {deadline.status === 'REPORTED'
                  ? 'Reported — not yet legally verified'
                  : deadline.status.replaceAll('_', ' ')}
              </span>
              <small>{deadline.trigger}</small>
            </div>
          ))}
        </div>
      ) : null}

      <details className={styles.details}>
        <summary>Add a date or deadline</summary>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (!deadlineAt) return;
            void addLegalMatterDeadline(accessToken, matter.id, {
              label: deadlineLabel,
              dueAt: new Date(deadlineAt).toISOString(),
              timeZone: deadlineZone,
              trigger: deadlineTrigger,
            })
              .then(async () => {
                setDeadlineLabel('');
                setDeadlineAt('');
                setDeadlineTrigger('');
                await refresh();
              })
              .catch(() =>
                setError('That date was not saved. Aureus did not guess or calculate a replacement.'),
              );
          }}
        >
          <label className={styles.label}>
            Label
            <input required value={deadlineLabel} onChange={(event) => setDeadlineLabel(event.target.value)} />
          </label>
          <label className={styles.label}>
            Date/time
            <input required type="datetime-local" value={deadlineAt} onChange={(event) => setDeadlineAt(event.target.value)} />
          </label>
          <label className={styles.label}>
            Time zone
            <input required value={deadlineZone} onChange={(event) => setDeadlineZone(event.target.value)} />
          </label>
          <label className={styles.label}>
            What created this date?
            <input
              required
              value={deadlineTrigger}
              onChange={(event) => setDeadlineTrigger(event.target.value)}
              placeholder="Notice, order, hearing notice, member report…"
            />
          </label>
          <Button type="submit">Save reported date</Button>
        </form>
      </details>

      <details className={styles.details}>
        <summary>Add a source</summary>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            void addLegalMatterSource(accessToken, matter.id, {
              title: sourceTitle,
              url: sourceUrl,
              kind: 'OFFICIAL_PROCEDURE',
              jurisdiction: matter.jurisdiction,
              proposition: sourceProposition,
            })
              .then(async () => {
                setSourceTitle('');
                setSourceUrl('');
                setSourceProposition('');
                await refresh();
              })
              .catch(() => setError('The source was not saved.'));
          }}
        >
          <label className={styles.label}>
            Source title
            <input required value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} />
          </label>
          <label className={styles.label}>
            Source HTTPS URL (official status is verified separately)
            <input required type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
          </label>
          <label className={styles.label}>
            What do you think it supports?
            <textarea required value={sourceProposition} onChange={(event) => setSourceProposition(event.target.value)} />
          </label>
          <Button type="submit">Add as reported source</Button>
        </form>
      </details>

      {matter.sources.length > 0 ? (
        <div className={styles.section}>
          <h3>Sources</h3>
          {matter.sources.map((source) => (
            <div className={styles.item} key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              <span>
                {source.verification === 'IDENTITY_VERIFIED'
                  ? 'Official source identity verified'
                  : 'Member-reported source — identity not yet verified'}
              </span>
              <small>{source.proposition}</small>
            </div>
          ))}
        </div>
      ) : null}

      <details className={styles.details}>
        <summary>Add a fact or event</summary>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void addLegalMatterFact(accessToken, matter.id, fact)
              .then(async () => {
                setFact('');
                await refresh();
              })
              .catch(() => setError('The fact was not saved.'));
          }}
        >
          <label className={styles.label}>
            What happened?
            <textarea required value={fact} onChange={(event) => setFact(event.target.value)} />
          </label>
          <Button type="submit">Save as reported</Button>
        </form>
      </details>

      {matter.facts.length > 0 ? (
        <div className={styles.section}>
          <h3>Facts and events</h3>
          {matter.facts.map((entry) => (
            <div className={styles.item} key={entry.id}>
              <span>{entry.statement}</span>
              <small>
                {entry.provenance === 'OBSERVED'
                  ? 'Observed from governed evidence'
                  : 'Reported — not independently verified'}
              </small>
            </div>
          ))}
        </div>
      ) : null}

      {matter.legalAidResources.length > 0 ? (
        <div className={styles.section}>
          <h3>Verified legal-help directory entries</h3>
          {matter.legalAidResources.map((resource) => (
            <div className={styles.item} key={resource.id}>
              <strong>{resource.organizationName}</strong>
              <span>{resource.description}</span>
              {resource.phone ? <a href={`tel:${resource.phone}`}>{resource.phone}</a> : null}
              {resource.website ? (
                <a href={resource.website} target="_blank" rel="noreferrer">Official website</a>
              ) : null}
              <small>
                The directory entry is verified. Eligibility, jurisdictional fit, and representation
                availability still require confirmation. A referral is not treated as completion.
              </small>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          disabled={pendingReview}
          onClick={() => {
            void requestLegalReview(
              accessToken,
              matter.id,
              'Please verify material official-source identity, observed record facts, and any high-stakes uncertainty before I rely on it.',
            )
              .then(async () => {
                setNotice(
                  'Legal review requested. Aureus will keep carrying the safe surrounding work while the gated review is handled.',
                );
                await refresh();
              })
              .catch(() => setError('The legal-review request was not recorded.'));
          }}
        >
          {pendingReview ? 'Legal review requested' : 'Request human/legal review'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void checkLegalAction(accessToken, matter.id, 'FILE')
              .then((result) => setNotice(result.reason))
              .catch(() => setError('Aureus could not evaluate that action safely.'));
          }}
        >
          Check before filing
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void getLegalPreparationPacket(accessToken, matter.id)
              .then(setPacket)
              .catch(() => setError('Aureus could not prepare the packet.'));
          }}
        >
          Build preparation packet
        </Button>
      </div>

      {packet ? (
        <div className={styles.packet}>
          <h3>Preparation packet</h3>
          <p><strong>Summary:</strong> {packet.summary}</p>
          <p><strong>Posture:</strong> {packet.proceduralPosture}</p>
          <p><strong>Member remains decision-maker:</strong> yes</p>
          <p><strong>Questions still needing judgment:</strong></p>
          <ul>
            {packet.unresolvedLegalQuestions.map((question) => <li key={question}>{question}</li>)}
          </ul>
        </div>
      ) : null}

      {!matter.closedAt ? (
        <details className={styles.details}>
          <summary>Record the underlying result</summary>
          <p className={styles.copy}>
            Preparation, a referral, or a hearing is not automatically completion. Record whether
            the underlying legal need itself is resolved.
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void reportLegalMatterOutcome(
                  accessToken,
                  matter.id,
                  false,
                  'The underlying legal need still requires work.',
                ).then(setMatter)
              }
            >
              Still needs work
            </Button>
            <Button
              type="button"
              onClick={() =>
                void reportLegalMatterOutcome(
                  accessToken,
                  matter.id,
                  true,
                  'Member reported the underlying legal need resolved.',
                ).then(setMatter)
              }
            >
              Underlying need resolved
            </Button>
          </div>
        </details>
      ) : (
        <p className={styles.closed}>
          Matter closed from a member-reported underlying outcome. Retention state:{' '}
          {matter.retention.state.replaceAll('_', ' ')}.
        </p>
      )}

      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
