'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  approveBusinessKnowledge,
  createBusinessKnowledge,
  createLibraryCandidate,
  importBusinessKnowledge,
  listBusinessKnowledge,
  rejectBusinessKnowledge,
  submitBusinessKnowledge,
  type BusinessKnowledgeRecord,
  type BusinessKnowledgeType,
} from '../../../lib/api/business-knowledge';
import { getBusinessConsole, listMyBusinessTenants } from '../../../lib/api/business-console';
import { useSession } from '../../../state';
import { knowledgePermissions } from './knowledge-permissions';
import styles from './BusinessKnowledgeWorkspace.module.css';

const NOTICE =
  'Uploads and business approval establish tenant-owned source material only. They do not make a statement legal advice, guarantee objective truth, or admit it to the Aureus Library.';

const TYPES: Array<{ value: BusinessKnowledgeType; label: string }> = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'PRICING_BOUNDARY', label: 'Pricing boundary' },
  { value: 'GEOGRAPHY', label: 'Service geography' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'ESCALATION', label: 'Escalation' },
];

interface FormState {
  mode: 'manual' | 'import';
  title: string;
  summary: string;
  content: string;
  knowledgeType: BusinessKnowledgeType;
  sourceReference: string;
  sourceUrl: string;
  freshnessIntervalDays: string;
  fileName: string;
  mimeType: 'text/plain' | 'text/markdown';
  acknowledged: boolean;
}

const EMPTY_FORM: FormState = {
  mode: 'manual',
  title: '',
  summary: '',
  content: '',
  knowledgeType: 'SERVICE',
  sourceReference: '',
  sourceUrl: '',
  freshnessIntervalDays: '90',
  fileName: '',
  mimeType: 'text/plain',
  acknowledged: false,
};

export function BusinessKnowledgeWorkspace() {
  const { session } = useSession();
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [records, setRecords] = useState<BusinessKnowledgeRecord[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'working' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const permissions = knowledgePermissions(membershipRole, session.roles);

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

        const tenant = tenants[0];
        const [consoleData, knowledge] = await Promise.all([
          getBusinessConsole(session.accessToken!, tenant.id),
          listBusinessKnowledge(session.accessToken!, tenant.id),
        ]);
        if (!active) return;

        setTenantId(tenant.id);
        setTenantName(tenant.name);
        setMembershipRole(consoleData.membershipRole);
        setRecords(knowledge);
        setState('ready');
      })
      .catch(() => {
        if (active) {
          setMessage('We could not open the knowledge workspace. Please try again.');
          setState('error');
        }
      });

    return () => {
      active = false;
    };
  }, [session.accessToken]);

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session.accessToken || !tenantId || !permissions.canEdit) return;
    setState('working');
    setMessage('');

    const base = {
      title: form.title,
      summary: form.summary,
      content: form.content,
      knowledgeType: form.knowledgeType,
      sourceReference: form.sourceReference,
      sourceUrl: form.sourceUrl || undefined,
      freshnessIntervalDays: Number(form.freshnessIntervalDays),
    };

    try {
      const created = form.mode === 'import'
        ? await importBusinessKnowledge(session.accessToken, tenantId, {
            ...base,
            fileName: form.fileName,
            mimeType: form.mimeType,
            acknowledgeUnverifiedSource: true,
          })
        : await createBusinessKnowledge(session.accessToken, tenantId, base);

      setRecords((current) => [created, ...current]);
      setForm(EMPTY_FORM);
      setMessage('Draft saved privately. Submit it when it is ready for accountable review.');
      setState('ready');
    } catch {
      setMessage('Nothing was saved. Check the source, content length, and freshness interval.');
      setState('error');
    }
  };

  const replaceRecord = (next: BusinessKnowledgeRecord) => {
    setRecords((current) => current.map((record) => record.id === next.id ? next : record));
  };

  const act = async (
    work: () => Promise<BusinessKnowledgeRecord | { id: string; payloadSha256: string; status: 'PENDING' }>,
    success: string,
  ) => {
    setState('working');
    setMessage('');
    try {
      const result = await work();
      if ('organizationId' in result) replaceRecord(result);
      setMessage(success);
      setState('ready');
    } catch {
      setMessage('The action was not applied. Refresh the record and check your role and its current state.');
      setState('error');
    }
  };

  if (state === 'loading') {
    return <section className={styles.surface} aria-busy="true"><p>Opening business knowledge…</p></section>;
  }

  if (state === 'empty') {
    return (
      <section className={styles.surface}>
        <h1>No business workspace yet</h1>
        <p>A business tenant must be connected before it can own knowledge.</p>
        <Link href="/business">Return to business setup</Link>
      </section>
    );
  }

  if (!tenantId) {
    return <section className={styles.surface} role="alert"><h1>Knowledge unavailable</h1><p>{message}</p></section>;
  }

  return (
    <section className={styles.surface}>
      <header className={styles.header}>
        <div>
          <Link href="/business" className={styles.back}>← Business console</Link>
          <p className={styles.eyebrow}>Tenant knowledge</p>
          <h1>{tenantName}</h1>
          <p>Teach the Ward what this business has actually approved—and when it must be checked again.</p>
        </div>
        <div className={styles.count}>
          <strong>{records.length}</strong>
          <span>source records</span>
        </div>
      </header>

      <aside className={styles.notice} aria-label="Source assurance boundary">
        <strong>Source material is not automatic truth.</strong>
        <p>{NOTICE}</p>
      </aside>

      {permissions.canEdit ? (
        <form className={styles.form} onSubmit={(event) => void saveDraft(event)}>
          <div className={styles.mode} role="group" aria-label="Entry method">
            <button
              type="button"
              aria-pressed={form.mode === 'manual'}
              onClick={() => setForm((value) => ({ ...value, mode: 'manual' }))}
            >
              Manual entry
            </button>
            <button
              type="button"
              aria-pressed={form.mode === 'import'}
              onClick={() => setForm((value) => ({ ...value, mode: 'import' }))}
            >
              Safe text import
            </button>
          </div>

          <div className={styles.grid}>
            <label>
              Knowledge type
              <select
                value={form.knowledgeType}
                onChange={(event) => setForm((value) => ({
                  ...value,
                  knowledgeType: event.target.value as BusinessKnowledgeType,
                }))}
              >
                {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>

            <label>
              Review every
              <select
                value={form.freshnessIntervalDays}
                onChange={(event) => setForm((value) => ({ ...value, freshnessIntervalDays: event.target.value }))}
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
              </select>
            </label>
          </div>

          <label>
            Title
            <input
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
            />
          </label>

          <label>
            Short answer
            <textarea
              required
              maxLength={500}
              rows={2}
              value={form.summary}
              onChange={(event) => setForm((value) => ({ ...value, summary: event.target.value }))}
            />
          </label>

          <label>
            {form.mode === 'import' ? 'Paste plain text or Markdown' : 'Approved source content'}
            <textarea
              required
              minLength={10}
              maxLength={100000}
              rows={7}
              value={form.content}
              onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))}
            />
          </label>

          <div className={styles.grid}>
            <label>
              Provenance / source reference
              <input
                required
                maxLength={500}
                placeholder="Owner-confirmed service list, August 2026"
                value={form.sourceReference}
                onChange={(event) => setForm((value) => ({ ...value, sourceReference: event.target.value }))}
              />
            </label>
            <label>
              Source URL, if any
              <input
                type="url"
                value={form.sourceUrl}
                onChange={(event) => setForm((value) => ({ ...value, sourceUrl: event.target.value }))}
              />
            </label>
          </div>

          {form.mode === 'import' ? (
            <div className={styles.importBoundary}>
              <div className={styles.grid}>
                <label>
                  Original filename
                  <input
                    required
                    maxLength={200}
                    value={form.fileName}
                    onChange={(event) => setForm((value) => ({ ...value, fileName: event.target.value }))}
                  />
                </label>
                <label>
                  Text format
                  <select
                    value={form.mimeType}
                    onChange={(event) => setForm((value) => ({
                      ...value,
                      mimeType: event.target.value as FormState['mimeType'],
                    }))}
                  >
                    <option value="text/plain">Plain text</option>
                    <option value="text/markdown">Markdown</option>
                  </select>
                </label>
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  required
                  checked={form.acknowledged}
                  onChange={(event) => setForm((value) => ({ ...value, acknowledged: event.target.checked }))}
                />
                I understand this import is unverified source material—not legal advice, objective truth, or Library knowledge.
              </label>
            </div>
          ) : null}

          <button type="submit" className={styles.primary} disabled={state === 'working'}>
            Save private draft
          </button>
        </form>
      ) : null}

      {message ? (
        <p className={state === 'error' ? styles.error : styles.message} role={state === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      ) : null}

      <div className={styles.records}>
        <h2>Knowledge records</h2>
        {records.length === 0 ? <p>No source records have been created yet.</p> : null}
        {records.map((record) => (
          <article className={styles.record} key={record.id}>
            <div className={styles.recordHeader}>
              <div>
                <span className={styles.type}>{record.knowledgeType.replaceAll('_', ' ')}</span>
                <h3>{record.title}</h3>
              </div>
              <span className={styles.status} data-status={record.status}>{record.status.replaceAll('_', ' ')}</span>
            </div>
            <p>{record.summary}</p>
            <dl>
              <div><dt>Source</dt><dd>{record.sourceReference}</dd></div>
              <div><dt>Next review</dt><dd>{new Date(record.nextReviewAt).toLocaleDateString()}</dd></div>
              <div><dt>Accountable reviewer</dt><dd>{record.accountableReviewerId}</dd></div>
            </dl>
            {record.rejectionReason ? <p className={styles.rejection}>Rejected: {record.rejectionReason}</p> : null}

            <div className={styles.actions}>
              {permissions.canEdit && (record.status === 'DRAFT' || record.status === 'REJECTED') ? (
                <button
                  type="button"
                  onClick={() => void act(
                    () => submitBusinessKnowledge(session.accessToken!, tenantId, record.id),
                    'Submitted for accountable review.',
                  )}
                >
                  Submit for review
                </button>
              ) : null}

              {permissions.canReview && record.status === 'UNDER_REVIEW' ? (
                <>
                  <button
                    type="button"
                    onClick={() => void act(
                      () => approveBusinessKnowledge(session.accessToken!, tenantId, record.id),
                      'Approved for this tenant. Its review clock has started.',
                    )}
                  >
                    Approve
                  </button>
                  <input
                    aria-label={`Rejection reason for ${record.title}`}
                    placeholder="Reason required"
                    value={reasons[record.id] ?? ''}
                    onChange={(event) => setReasons((value) => ({ ...value, [record.id]: event.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={(reasons[record.id]?.trim().length ?? 0) < 3}
                    onClick={() => void act(
                      () => rejectBusinessKnowledge(
                        session.accessToken!,
                        tenantId,
                        record.id,
                        reasons[record.id],
                      ),
                      'Rejected with an accountable reason.',
                    )}
                  >
                    Reject
                  </button>
                </>
              ) : null}

              {permissions.canReview && record.status === 'APPROVED' ? (
                <button
                  type="button"
                  onClick={() => void act(
                    () => createLibraryCandidate(session.accessToken!, tenantId, record.id),
                    'A hashed candidate snapshot was created for later Library review. Nothing was admitted automatically.',
                  )}
                >
                  Create Library candidate
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
