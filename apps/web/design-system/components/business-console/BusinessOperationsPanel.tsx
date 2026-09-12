'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  assignBusinessLead,
  exportBusinessOperations,
  getBusinessLead,
  getBusinessOperationsSummary,
  listBusinessLeads,
  transitionBusinessLead,
  type BusinessLeadDetail,
  type BusinessLeadSummary,
  type BusinessOperationsSummary,
  type WardLeadStatus,
} from '../../../lib/api/business-operations';
import { listMyBusinessTenants } from '../../../lib/api/business-console';
import { useSession } from '../../../state';
import { KitchenBathReadyProjectCard } from '../public-ward/KitchenBathReadyProjectCard';
import styles from './BusinessOperationsPanel.module.css';

const NEXT_STATUS: Partial<Record<WardLeadStatus, WardLeadStatus[]>> = {
  SUBMITTED: ['ACCEPTED'],
  ACCEPTED: ['CONTACTED', 'LOST'],
  CONTACTED: ['CLOSED', 'LOST'],
};

export function BusinessOperationsPanel() {
  const { session } = useSession();
  const [tenantId, setTenantId] = useState('');
  const [summary, setSummary] = useState<BusinessOperationsSummary | null>(null);
  const [leads, setLeads] = useState<BusinessLeadSummary[]>([]);
  const [selected, setSelected] = useState<BusinessLeadDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'working' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [outcomeReason, setOutcomeReason] = useState('');

  const refresh = async (accessToken: string, id: string, selectedId?: string) => {
    const [nextSummary, nextLeads] = await Promise.all([
      getBusinessOperationsSummary(accessToken, id),
      listBusinessLeads(accessToken, id),
    ]);
    setSummary(nextSummary);
    setLeads(nextLeads);
    if (selectedId) {
      setSelected(await getBusinessLead(accessToken, id, selectedId));
    }
  };

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
        setTenantId(id);
        await refresh(session.accessToken!, id);
        if (active) setState('ready');
      })
      .catch(() => {
        if (active) {
          setMessage('We could not load observed business operations.');
          setState('error');
        }
      });
    return () => { active = false; };
  }, [session.accessToken]);

  const selectedOwner = useMemo(
    () => summary?.owners.find((owner) => owner.userId === selected?.assignedToId) ?? null,
    [selected, summary],
  );

  const chooseLead = async (leadId: string) => {
    if (!session.accessToken || !tenantId) return;
    setState('working');
    setMessage('');
    try {
      setSelected(await getBusinessLead(session.accessToken, tenantId, leadId));
      setOutcomeReason('');
      setState('ready');
    } catch {
      setMessage('That handoff could not be opened. Refresh the inbox and try again.');
      setState('error');
    }
  };

  const assign = async (assignedToId: string) => {
    if (!session.accessToken || !tenantId || !selected) return;
    setState('working');
    try {
      await assignBusinessLead(session.accessToken, tenantId, selected.id, assignedToId);
      await refresh(session.accessToken, tenantId, selected.id);
      setMessage('Owner updated with tenant-scoped accountability.');
      setState('ready');
    } catch {
      setMessage('The owner was not changed. Only eligible members of this tenant can receive the handoff.');
      setState('error');
    }
  };

  const transition = async (status: WardLeadStatus) => {
    if (!session.accessToken || !tenantId || !selected) return;
    const terminal = status === 'CLOSED' || status === 'LOST';
    if (terminal && outcomeReason.trim().length < 3) {
      setMessage('Add a factual outcome reason before closing or losing a handoff.');
      setState('error');
      return;
    }
    setState('working');
    try {
      await transitionBusinessLead(
        session.accessToken,
        tenantId,
        selected.id,
        status,
        terminal ? outcomeReason.trim() : undefined,
      );
      await refresh(session.accessToken, tenantId, selected.id);
      setMessage(`Handoff moved to ${status.toLowerCase()}.`);
      setOutcomeReason('');
      setState('ready');
    } catch {
      setMessage('The handoff state changed or that transition is not allowed. Refresh before trying again.');
      setState('error');
    }
  };

  const exportSnapshot = async () => {
    if (!session.accessToken || !tenantId) return;
    setState('working');
    try {
      const snapshot = await exportBusinessOperations(session.accessToken, tenantId);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `aureus-business-operations-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Tenant-scoped operational export prepared.');
      setState('ready');
    } catch {
      setMessage('The export was not created. Owner, admin, or manager permission is required.');
      setState('error');
    }
  };

  if (state === 'loading') return <section className={styles.surface} aria-busy="true"><p>Opening business operations…</p></section>;
  if (state === 'empty') return null;
  if (!summary) return <section className={styles.surface} role="alert"><p>{message || 'Business operations unavailable.'}</p></section>;

  return (
    <section className={styles.surface} aria-labelledby="business-operations-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Observed operations</p>
          <h2 id="business-operations-title">Handoffs, knowledge, routing, and provider evidence</h2>
          <p className={styles.subtle}>This view is scoped to the business you represent. It reports recorded evidence, not inferred performance.</p>
        </div>
        <div className={styles.toolbar}>
          <button type="button" onClick={() => void exportSnapshot()} disabled={state === 'working'}>Export snapshot</button>
          <Link href="/business/knowledge">Review knowledge</Link>
        </div>
      </header>

      {message ? <p className={state === 'error' ? styles.error : styles.subtle} role={state === 'error' ? 'alert' : 'status'}>{message}</p> : null}

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Handoff pipeline</h3>
          <div className={styles.metricGrid}>
            <div className={styles.metric}><strong>{summary.pipeline.total}</strong><span>retained handoffs</span></div>
            <div className={styles.metric}><strong>{summary.pipeline.counts.SUBMITTED ?? 0}</strong><span>submitted</span></div>
            <div className={styles.metric}><strong>{summary.pipeline.awaitingNotification}</strong><span>notification not confirmed</span></div>
          </div>
          <div className={styles.inbox} aria-label="Handoff inbox">
            {leads.length === 0 ? <p>No current handoffs.</p> : null}
            {leads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className={styles.leadButton}
                aria-pressed={selected?.id === lead.id}
                onClick={() => void chooseLead(lead.id)}
              >
                <strong>{lead.displayName}</strong> · <span className={styles.status}>{lead.status}</span><br />
                <span>{lead.projectSummary}</span><br />
                <small>{lead.assignee?.user.profile?.displayName || lead.assignee?.user.email || 'Owner unavailable'} · {new Date(lead.submittedAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h3>Provider health & spend</h3>
          <div className={styles.metricGrid}>
            <div className={styles.metric}><strong>{summary.provider.status.replaceAll('_', ' ')}</strong><span>observed status</span></div>
            <div className={styles.metric}><strong>{summary.provider.requests}</strong><span>requests / 24h</span></div>
            <div className={styles.metric}><strong>${summary.provider.spendUsd.toFixed(4)}</strong><span>recorded spend / 24h</span></div>
          </div>
          <p className={styles.basis}>{summary.provider.basis}</p>
          <p className={styles.subtle}>Success {summary.provider.successes} · Failed {summary.provider.failures} · Moderation {summary.provider.moderationBlocks} · Avg latency {summary.provider.averageLatencyMs ?? '—'} ms</p>
        </article>

        <article className={styles.card}>
          <h3>Business routing & fallback</h3>
          <p><span className={styles.status}>{summary.routing.publicStatus}</span></p>
          <p><strong>Hours:</strong> {JSON.stringify(summary.routing.businessHours)}</p>
          <p><strong>Human routes:</strong> {JSON.stringify(summary.routing.contactRoutes)}</p>
          <p className={styles.subtle}>{summary.routing.fallbackRule}</p>
        </article>

        <article className={styles.card}>
          <h3>Knowledge freshness</h3>
          <div className={styles.metricGrid}>
            <div className={styles.metric}><strong>{summary.knowledge.currentApproved}</strong><span>current approved</span></div>
            <div className={styles.metric}><strong>{summary.knowledge.dueOrReviewing}</strong><span>due / reviewing</span></div>
            <div className={styles.metric}><strong>{summary.knowledge.total}</strong><span>total records</span></div>
          </div>
          <ul className={styles.queue}>
            {summary.knowledge.queue.slice(0, 8).map((record) => (
              <li key={record.id}>{record.title} — {record.status.replaceAll('_', ' ')} — review {new Date(record.nextReviewAt).toLocaleDateString()}</li>
            ))}
          </ul>
        </article>
      </div>

      {selected ? (
        <article className={styles.detail} aria-labelledby="handoff-detail-title">
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Accountable handoff</p>
              <h3 id="handoff-detail-title">{selected.displayName}: {selected.projectSummary}</h3>
              <p>{selected.contactMethod}: {selected.contactValue}</p>
            </div>
            <span className={styles.status}>{selected.status}</span>
          </div>

          <div className={styles.actions}>
            <label>
              Owner{' '}
              <select value={selected.assignedToId} onChange={(event) => void assign(event.target.value)} disabled={state === 'working'}>
                {summary.owners.map((owner) => (
                  <option value={owner.userId} key={owner.userId}>{owner.displayName || owner.email} — {owner.role}</option>
                ))}
              </select>
            </label>
            <span>Current: {selectedOwner?.displayName || selectedOwner?.email || selected.assignedToId}</span>
          </div>

          {(NEXT_STATUS[selected.status]?.some((status) => status === 'CLOSED' || status === 'LOST')) ? (
            <div className={styles.actions}>
              <label>
                Factual outcome reason{' '}
                <input value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} maxLength={500} />
              </label>
            </div>
          ) : null}

          <div className={styles.actions} aria-label="Next handoff actions">
            {(NEXT_STATUS[selected.status] ?? []).map((status) => (
              <button key={status} type="button" onClick={() => void transition(status)} disabled={state === 'working'}>
                Mark {status.toLowerCase()}
              </button>
            ))}
          </div>

          {selected.readyProject ? (
            <>
              <h4>Ready Project</h4>
              <KitchenBathReadyProjectCard
                project={selected.readyProject}
                audience="business"
              />
            </>
          ) : null}

          <h4>Source conversation evidence</h4>
          {selected.conversation.messages.map((item) => (
            <div key={item.id} className={styles.message}>
              <strong>{item.role === 'WARD' ? 'Ward' : 'Visitor'}</strong>
              <p>{item.content}</p>
              {item.sources.map((source) => (
                <div className={styles.source} key={`${item.id}-${source.knowledgeRecordId}`}>
                  Source: {source.sourceTitle} · reviewed {new Date(source.sourceReviewedAt).toLocaleDateString()} · SHA-256 {source.sourceContentSha256.slice(0, 12)}…
                </div>
              ))}
            </div>
          ))}
        </article>
      ) : null}
    </section>
  );
}
