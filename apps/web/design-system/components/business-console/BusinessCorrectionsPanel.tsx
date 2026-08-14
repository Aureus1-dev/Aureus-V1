'use client';

import { useEffect, useState } from 'react';
import {
  createBusinessKnowledgeCorrection,
  listBusinessKnowledge,
  type BusinessKnowledgeRecord,
} from '../../../lib/api/business-knowledge';
import { listMyBusinessTenants } from '../../../lib/api/business-console';
import { useSession } from '../../../state';
import styles from './BusinessCorrectionsPanel.module.css';

export function BusinessCorrectionsPanel() {
  const { session } = useSession();
  const [tenantId, setTenantId] = useState('');
  const [approved, setApproved] = useState<BusinessKnowledgeRecord[]>([]);
  const [selected, setSelected] = useState<BusinessKnowledgeRecord | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'working' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session.accessToken) return;
    let active = true;
    void listMyBusinessTenants(session.accessToken)
      .then(async (tenants) => {
        if (!active) return;
        if (tenants.length === 0) {
          setState('empty');
          return;
        }
        const id = tenants[0].id;
        const records = await listBusinessKnowledge(session.accessToken!, id);
        if (!active) return;
        setTenantId(id);
        setApproved(records.filter((record) => record.status === 'APPROVED'));
        setState('ready');
      })
      .catch(() => {
        if (active) {
          setMessage('We could not load approved knowledge for corrections.');
          setState('error');
        }
      });
    return () => { active = false; };
  }, [session.accessToken]);

  const begin = (record: BusinessKnowledgeRecord) => {
    setSelected(record);
    setCorrectionReason('');
    setTitle(record.title);
    setSummary(record.summary);
    setContent(record.content);
    setSourceReference(record.sourceReference);
    setMessage('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session.accessToken || !tenantId || !selected) return;
    setState('working');
    setMessage('');
    try {
      await createBusinessKnowledgeCorrection(session.accessToken, tenantId, selected.id, {
        title,
        summary,
        content,
        knowledgeType: selected.knowledgeType,
        sourceReference,
        sourceUrl: selected.sourceUrl || undefined,
        freshnessIntervalDays: selected.freshnessIntervalDays,
        correctionReason,
      });
      setMessage('Correction saved as a private draft. The currently approved source remains live until this replacement is separately submitted, reviewed, and approved.');
      setSelected(null);
      setState('ready');
    } catch {
      setMessage('The correction was not created. A tenant reviewer is required, and only one draft/review correction may exist for an approved source.');
      setState('error');
    }
  };

  if (state === 'loading') return <section className={styles.surface} aria-busy="true"><p>Opening reviewed corrections…</p></section>;
  if (state === 'empty') return null;

  return (
    <section className={styles.surface} aria-labelledby="reviewed-corrections-title">
      <header className={styles.header}>
        <h2 id="reviewed-corrections-title">Reviewed corrections</h2>
        <p>Correct approved Ward knowledge without silently changing what is live.</p>
      </header>

      <p className={styles.notice}>
        <strong>Approval continuity:</strong> proposing or reviewing a correction does not replace the approved source. The replacement becomes live only after its own approval; that approval archives the prior source in the same database transaction.
      </p>

      {message ? <p className={state === 'error' ? styles.error : styles.message} role={state === 'error' ? 'alert' : 'status'}>{message}</p> : null}

      <div className={styles.records}>
        {approved.length === 0 ? <p>No approved records are available for correction.</p> : null}
        {approved.map((record) => (
          <div className={styles.record} key={record.id}>
            <div><strong>{record.title}</strong><br /><small>Reviewed {record.reviewedAt ? new Date(record.reviewedAt).toLocaleDateString() : '—'}</small></div>
            <button type="button" onClick={() => begin(record)}>Propose correction</button>
          </div>
        ))}
      </div>

      {selected ? (
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <h3>Correction for “{selected.title}”</h3>
          <label>
            Why this needs correction
            <textarea required minLength={3} maxLength={500} rows={2} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
          </label>
          <label>Title<input required minLength={3} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Short answer<textarea required maxLength={500} rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          <label>Replacement source content<textarea required minLength={10} maxLength={100000} rows={7} value={content} onChange={(event) => setContent(event.target.value)} /></label>
          <label>Updated provenance / source reference<input required maxLength={500} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} /></label>
          <button type="submit" disabled={state === 'working'}>{state === 'working' ? 'Saving correction…' : 'Save correction draft'}</button>
        </form>
      ) : null}
    </section>
  );
}
