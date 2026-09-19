'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useBusiness, useSession } from '../../../state';
import { KitchenBathReadyProjectCard } from '../public-ward/KitchenBathReadyProjectCard';
import { RevenueCompletionPanel } from './RevenueCompletionPanel';
import styles from './BusinessOperationsPanel.module.css';

const NEXT_STATUS: Partial<Record<WardLeadStatus, WardLeadStatus[]>> = {
  SUBMITTED: ['ACCEPTED'],
  ACCEPTED: ['CONTACTED', 'LOST'],
  CONTACTED: ['CLOSED', 'LOST'],
};

const TERMINAL_LEAD_STATUSES = new Set<WardLeadStatus>(['CLOSED', 'LOST']);

type LoadState = 'loading' | 'ready' | 'working' | 'empty' | 'error';

export function BusinessOperationsPanel() {
  const { session } = useSession();
  const { activeTenant, state: businessState } = useBusiness();
  const tenantId = activeTenant?.id ?? '';
  const loadGeneration = useRef(0);
  const [loadedTenantId, setLoadedTenantId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BusinessOperationsSummary | null>(null);
  const [leads, setLeads] = useState<BusinessLeadSummary[]>([]);
  const [selected, setSelected] = useState<BusinessLeadDetail | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState('');
  const [outcomeReason, setOutcomeReason] = useState('');

  const refresh = async (
    accessToken: string,
    id: string,
    selectedId: string | undefined,
    generation: number,
  ): Promise<boolean> => {
    if (generation !== loadGeneration.current) return false;

    const [nextSummary, nextLeads, nextSelected] = await Promise.all([
      getBusinessOperationsSummary(accessToken, id),
      listBusinessLeads(accessToken, id),
      selectedId ? getBusinessLead(accessToken, id, selectedId) : Promise.resolve(null),
    ]);

    if (generation !== loadGeneration.current) return false;
    setSummary(nextSummary);
    setLeads(nextLeads);
    if (selectedId) setSelected(nextSelected);
    setLoadedTenantId(id);
    return true;
  };

  useEffect(() => {
    const generation = ++loadGeneration.current;

    if (!session.accessToken || businessState.isLoading) {
      setState('loading');
      setLoadedTenantId(null);
      setSummary(null);
      setLeads([]);
      setSelected(null);
      setMessage('');
      return;
    }

    if (!activeTenant) {
      setState('empty');
      setLoadedTenantId(null);
      setSummary(null);
      setLeads([]);
      setSelected(null);
      setMessage('');
      return;
    }

    // Clear immediately, and bind the next committed payload to the generation
    // that requested it. A late response from another tenant can never commit.
    setState('loading');
    setLoadedTenantId(null);
    setSummary(null);
    setLeads([]);
    setSelected(null);
    setMessage('');

    void refresh(session.accessToken, activeTenant.id, undefined, generation)
      .then((committed) => {
        if (committed && generation === loadGeneration.current) setState('ready');
      })
      .catch(() => {
        if (generation !== loadGeneration.current) return;
        setSummary(null);
        setLeads([]);
        setSelected(null);
        setLoadedTenantId(activeTenant.id);
        setMessage('We could not load observed business operations.');
        setState('error');
      });
  }, [session.accessToken, businessState.isLoading, activeTenant]);

  // Render-time binding closes the one-frame window before the tenant-change
  // effect runs. Private rows/actions are visible only with the tenant that
  // produced them.
  const contextMatches = Boolean(
    activeTenant && !businessState.isLoading && loadedTenantId === tenantId,
  );
  const visibleSummary = contextMatches ? summary : null;
  const visibleLeads = contextMatches ? leads : [];
  const visibleSelected = contextMatches ? selected : null;
  const visibleGeneration = loadGeneration.current;

  const selectedOwner = useMemo(
    () =>
      visibleSummary?.owners.find((owner) => owner.userId === visibleSelected?.assignedToId) ?? null,
    [visibleSelected, visibleSummary],
  );

  const chooseLead = async (leadId: string) => {
    if (!session.accessToken || !tenantId || !contextMatches) return;
    const id = tenantId;
    const generation = loadGeneration.current;
    setState('working');
    setMessage('');
    try {
      const nextSelected = await getBusinessLead(session.accessToken, id, leadId);
      if (generation !== loadGeneration.current) return;
      setSelected(nextSelected);
      setOutcomeReason('');
      setState('ready');
    } catch {
      if (generation !== loadGeneration.current) return;
      setMessage('That handoff could not be opened. Refresh the inbox and try again.');
      setState('error');
    }
  };

  const assign = async (assignedToId: string) => {
    if (!session.accessToken || !tenantId || !visibleSelected) return;
    const id = tenantId;
    const leadId = visibleSelected.id;
    const generation = loadGeneration.current;
    setState('working');
    try {
      await assignBusinessLead(session.accessToken, id, leadId, assignedToId);
      if (generation !== loadGeneration.current) return;
      const committed = await refresh(session.accessToken, id, leadId, generation);
      if (!committed) return;
      setMessage('Owner updated with tenant-scoped accountability.');
      setState('ready');
    } catch {
      if (generation !== loadGeneration.current) return;
      setMessage(
        'The owner was not changed. Only eligible members of this tenant can receive the handoff.',
      );
      setState('error');
    }
  };

  const transition = async (status: WardLeadStatus) => {
    if (!session.accessToken || !tenantId || !visibleSelected) return;
    const terminal = TERMINAL_LEAD_STATUSES.has(status);
    if (terminal && outcomeReason.trim().length < 3) {
      setMessage('Add a factual outcome reason before closing or losing a handoff.');
      setState('error');
      return;
    }

    const id = tenantId;
    const leadId = visibleSelected.id;
    const generation = loadGeneration.current;
    setState('working');
    try {
      await transitionBusinessLead(
        session.accessToken,
        id,
        leadId,
        status,
        terminal ? outcomeReason.trim() : undefined,
      );
      if (generation !== loadGeneration.current) return;
      const committed = await refresh(session.accessToken, id, leadId, generation);
      if (!committed) return;
      setMessage(`Handoff moved to ${status.toLowerCase()}.`);
      setOutcomeReason('');
      setState('ready');
    } catch {
      if (generation !== loadGeneration.current) return;
      setMessage(
        'The handoff state changed or that transition is not allowed. Refresh before trying again.',
      );
      setState('error');
    }
  };

  const exportSnapshot = async () => {
    if (!session.accessToken || !tenantId || !contextMatches) return;
    const id = tenantId;
    const generation = loadGeneration.current;
    setState('working');
    try {
      const snapshot = await exportBusinessOperations(session.accessToken, id);
      if (generation !== loadGeneration.current) return;
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
      if (generation !== loadGeneration.current) return;
      setMessage('The export was not created. Owner, admin, or manager permission is required.');
      setState('error');
    }
  };

  if (state === 'empty') return null;
  if (!contextMatches && state !== 'error') {
    return (
      <section className={styles.surface} aria-busy="true">
        <p>Opening business operations…</p>
      </section>
    );
  }
  if (state === 'loading') {
    return (
      <section className={styles.surface} aria-busy="true">
        <p>Opening business operations…</p>
      </section>
    );
  }
  if (!visibleSummary) {
    return (
      <section className={styles.surface} role="alert">
        <p>{message || 'Business operations unavailable.'}</p>
      </section>
    );
  }

  const revenueStarted = Boolean(visibleSelected?.revenueCompletion?.responsibilityId);
  const nextLeadStatuses = visibleSelected
    ? (NEXT_STATUS[visibleSelected.status] ?? []).filter(
        (status) => !(revenueStarted && TERMINAL_LEAD_STATUSES.has(status)),
      )
    : [];

  return (
    <section className={styles.surface} aria-labelledby="business-operations-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Observed operations</p>
          <h2 id="business-operations-title">
            Handoffs, knowledge, routing, and provider evidence
          </h2>
          <p className={styles.subtle}>
            This view is scoped to the business you represent. It reports recorded evidence, not
            inferred performance.
          </p>
        </div>
        <div className={styles.toolbar}>
          <button type="button" onClick={() => void exportSnapshot()} disabled={state === 'working'}>
            Export snapshot
          </button>
          <Link href="/business/knowledge">Review knowledge</Link>
        </div>
      </header>

      {message ? (
        <p
          className={state === 'error' ? styles.error : styles.subtle}
          role={state === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Handoff pipeline</h3>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <strong>{visibleSummary.pipeline.total}</strong>
              <span>retained handoffs</span>
            </div>
            <div className={styles.metric}>
              <strong>{visibleSummary.pipeline.counts.SUBMITTED ?? 0}</strong>
              <span>submitted</span>
            </div>
            <div className={styles.metric}>
              <strong>{visibleSummary.pipeline.awaitingNotification}</strong>
              <span>notification not confirmed</span>
            </div>
          </div>
          <div className={styles.inbox} aria-label="Handoff inbox">
            {visibleLeads.length === 0 ? <p>No current handoffs.</p> : null}
            {visibleLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className={styles.leadButton}
                aria-pressed={visibleSelected?.id === lead.id}
                onClick={() => void chooseLead(lead.id)}
              >
                <strong>{lead.displayName}</strong> ·{' '}
                <span className={styles.status}>{lead.status}</span>
                <br />
                <span>{lead.projectSummary}</span>
                <br />
                <small>
                  {lead.assignee?.user.profile?.displayName ||
                    lead.assignee?.user.email ||
                    'Owner unavailable'}{' '}
                  · {new Date(lead.submittedAt).toLocaleString()}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h3>Provider health & spend</h3>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <strong>{visibleSummary.provider.status.replaceAll('_', ' ')}</strong>
              <span>observed status</span>
            </div>
            <div className={styles.metric}>
              <strong>{visibleSummary.provider.requests}</strong>
              <span>requests / 24h</span>
            </div>
            <div className={styles.metric}>
              <strong>${visibleSummary.provider.spendUsd.toFixed(4)}</strong>
              <span>recorded spend / 24h</span>
            </div>
          </div>
          <p className={styles.basis}>{visibleSummary.provider.basis}</p>
          <p className={styles.subtle}>
            Success {visibleSummary.provider.successes} · Failed {visibleSummary.provider.failures}{' '}
            · Moderation {visibleSummary.provider.moderationBlocks} · Avg latency{' '}
            {visibleSummary.provider.averageLatencyMs ?? '—'} ms
          </p>
        </article>

        <article className={styles.card}>
          <h3>Business routing & fallback</h3>
          <p>
            <span className={styles.status}>{visibleSummary.routing.publicStatus}</span>
          </p>
          <p>
            <strong>Hours:</strong> {JSON.stringify(visibleSummary.routing.businessHours)}
          </p>
          <p>
            <strong>Human routes:</strong> {JSON.stringify(visibleSummary.routing.contactRoutes)}
          </p>
          <p className={styles.subtle}>{visibleSummary.routing.fallbackRule}</p>
        </article>

        <article className={styles.card}>
          <h3>Knowledge freshness</h3>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <strong>{visibleSummary.knowledge.currentApproved}</strong>
              <span>current approved</span>
            </div>
            <div className={styles.metric}>
              <strong>{visibleSummary.knowledge.dueOrReviewing}</strong>
              <span>due / reviewing</span>
            </div>
            <div className={styles.metric}>
              <strong>{visibleSummary.knowledge.total}</strong>
              <span>total records</span>
            </div>
          </div>
          <ul className={styles.queue}>
            {visibleSummary.knowledge.queue.slice(0, 8).map((record) => (
              <li key={record.id}>
                {record.title} — {record.status.replaceAll('_', ' ')} — review{' '}
                {new Date(record.nextReviewAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </article>
      </div>

      {visibleSelected ? (
        <article className={styles.detail} aria-labelledby="handoff-detail-title">
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Accountable handoff</p>
              <h3 id="handoff-detail-title">
                {visibleSelected.displayName}: {visibleSelected.projectSummary}
              </h3>
              <p>
                {visibleSelected.contactMethod}: {visibleSelected.contactValue}
              </p>
            </div>
            <span className={styles.status}>{visibleSelected.status}</span>
          </div>

          <div className={styles.actions}>
            <label>
              Owner{' '}
              <select
                value={visibleSelected.assignedToId}
                onChange={(event) => void assign(event.target.value)}
                disabled={state === 'working'}
              >
                {visibleSummary.owners.map((owner) => (
                  <option value={owner.userId} key={owner.userId}>
                    {owner.displayName || owner.email} — {owner.role}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Current:{' '}
              {selectedOwner?.displayName || selectedOwner?.email || visibleSelected.assignedToId}
            </span>
          </div>

          {nextLeadStatuses.some((status) => TERMINAL_LEAD_STATUSES.has(status)) ? (
            <div className={styles.actions}>
              <label>
                Factual outcome reason{' '}
                <input
                  value={outcomeReason}
                  onChange={(event) => setOutcomeReason(event.target.value)}
                  maxLength={500}
                />
              </label>
            </div>
          ) : null}

          <div className={styles.actions} aria-label="Next handoff actions">
            {nextLeadStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => void transition(status)}
                disabled={state === 'working'}
              >
                Mark {status.toLowerCase()}
              </button>
            ))}
          </div>

          {visibleSelected.readyProject ? (
            <>
              <h4>Ready Project</h4>
              <KitchenBathReadyProjectCard project={visibleSelected.readyProject} audience="business" />
            </>
          ) : null}

          {visibleSelected.revenueCompletion && session.accessToken && tenantId ? (
            <RevenueCompletionPanel
              key={`${tenantId}:${visibleSelected.id}:${visibleSelected.revenueCompletion.currentStage ?? 'start'}`}
              accessToken={session.accessToken}
              tenantId={tenantId}
              leadId={visibleSelected.id}
              projection={visibleSelected.revenueCompletion}
              onChanged={async () => {
                if (visibleGeneration !== loadGeneration.current) return;
                const committed = await refresh(
                  session.accessToken!,
                  tenantId,
                  visibleSelected.id,
                  visibleGeneration,
                );
                if (committed) setState('ready');
              }}
            />
          ) : null}

          <h4>Source conversation evidence</h4>
          {visibleSelected.conversation.messages.map((item) => (
            <div key={item.id} className={styles.message}>
              <strong>{item.role === 'WARD' ? 'Ward' : 'Visitor'}</strong>
              <p>{item.content}</p>
              {item.sources.map((source) => (
                <div className={styles.source} key={`${item.id}-${source.knowledgeRecordId}`}>
                  Source: {source.sourceTitle} · reviewed{' '}
                  {new Date(source.sourceReviewedAt).toLocaleDateString()} · SHA-256{' '}
                  {source.sourceContentSha256.slice(0, 12)}…
                </div>
              ))}
            </div>
          ))}
        </article>
      ) : null}
    </section>
  );
}
