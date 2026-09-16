'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listBusinessResponsibilities,
  type BusinessResponsibilityDto,
} from '../../../lib/api/business-responsibilities';
import { getBusinessConsole } from '../../../lib/api/business-console';
import { useBusiness, useSession } from '../../../state';
import { capabilitiesForRole } from './owner-capabilities';
import { BusinessResponsibilityDetail } from './BusinessResponsibilityDetail';
import {
  describeCompletion,
  ownerGroupFor,
  promiseOf,
  statusLabel,
} from './responsibility-language';
import styles from './BusinessOwnerHome.module.css';

type LoadState = 'loading' | 'ready' | 'no-business' | 'error';

/**
 * Step 5 — the Business Owner's home.
 *
 * The first viewport answers, in order: what needs me, what is Aureus
 * carrying, what actually happened. Administrative capability (setup,
 * members, operations, knowledge) stays reachable but is deliberately not
 * the owner's first mental model — it lives one link away under
 * `/business/admin`.
 *
 * Every read is tenant-scoped by the server. This component never reaches
 * past the Step 3/4 API, and never renders a responsibility it did not
 * receive for the currently selected organization.
 */
export function BusinessOwnerHome() {
  const { session } = useSession();
  const { activeTenant, state: businessState } = useBusiness();
  const tenantId = activeTenant?.id ?? '';

  const [responsibilities, setResponsibilities] = useState<BusinessResponsibilityDto[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    async (accessToken: string, organizationId: string) => {
      setState('loading');
      try {
        const rows = await listBusinessResponsibilities(accessToken, organizationId);
        setResponsibilities(rows);
        // Role drives which controls are offered. A failure here must never
        // widen capability, so the role stays null and controls stay hidden.
        try {
          const console_ = await getBusinessConsole(accessToken, organizationId);
          setRole(console_.membershipRole);
        } catch {
          setRole(null);
        }
        setState('ready');
      } catch {
        // A failed panel shows a bounded failure, never invented rows.
        setResponsibilities([]);
        setState('error');
      }
    },
    [],
  );

  useEffect(() => {
    if (!session.accessToken) return;
    if (businessState.isLoading) return;
    if (!activeTenant) {
      setResponsibilities([]);
      setSelectedId(null);
      setState('no-business');
      return;
    }
    setSelectedId(null);
    void load(session.accessToken, activeTenant.id);
  }, [session.accessToken, businessState.isLoading, activeTenant, load]);

  const capabilities = useMemo(() => capabilitiesForRole(role), [role]);

  const groups = useMemo(() => {
    const needsYou: BusinessResponsibilityDto[] = [];
    const carrying: BusinessResponsibilityDto[] = [];
    const closed: BusinessResponsibilityDto[] = [];
    for (const row of responsibilities) {
      const group = ownerGroupFor(row.status);
      if (group === 'needsYou') needsYou.push(row);
      else if (group === 'carrying') carrying.push(row);
      else closed.push(row);
    }
    return { needsYou, carrying, closed: closed.slice(0, 5) };
  }, [responsibilities]);

  const onChanged = useCallback(
    (updated: BusinessResponsibilityDto) => {
      setResponsibilities((rows) =>
        rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      );
    },
    [],
  );

  if (state === 'no-business') {
    return (
      <section className={styles.surface} aria-labelledby="owner-home-heading">
        <h1 id="owner-home-heading" className={styles.title}>
          Your business
        </h1>
        <p className={styles.empty}>
          You are not working inside a business yet.{' '}
          <Link href="/business/setup">Create a business workspace</Link> to let Aureus start
          carrying work for it.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.surface} aria-labelledby="owner-home-heading">
      <header className={styles.header}>
        <div>
          <h1 id="owner-home-heading" className={styles.title}>
            {activeTenant ? activeTenant.name : 'Your business'}
          </h1>
          <p className={styles.subtitle}>What Aureus is carrying for this business.</p>
        </div>
        <Link href="/business/admin" className={styles.secondaryLink}>
          Business settings
        </Link>
      </header>

      {state === 'loading' ? (
        <p className={styles.muted} role="status">
          Loading what Aureus is carrying…
        </p>
      ) : null}

      {state === 'error' ? (
        <p className={styles.failure} role="alert">
          Aureus could not load this business&rsquo;s work right now. Nothing here is out of date —
          it simply has not loaded. Try again shortly.
        </p>
      ) : null}

      {state === 'ready' ? (
        <>
          <OwnerSection
            id="needs-you"
            heading="Needs you"
            emphasis={groups.needsYou.length > 0}
            rows={groups.needsYou}
            emptyMessage="Aureus doesn’t need anything from you right now."
            onSelect={setSelectedId}
            selectedId={selectedId}
          />

          <OwnerSection
            id="carrying"
            heading="Aureus is carrying"
            rows={groups.carrying}
            emptyMessage="No active work is being carried for this business yet."
            onSelect={setSelectedId}
            selectedId={selectedId}
          />

          <OwnerSection
            id="recent"
            heading="Recently completed"
            rows={groups.closed}
            emptyMessage="Nothing has finished yet."
            onSelect={setSelectedId}
            selectedId={selectedId}
            showOutcome
          />

          <section className={styles.trust} aria-labelledby="owner-trust-heading">
            <h2 id="owner-trust-heading" className={styles.sectionHeading}>
              What Aureus is allowed to do
            </h2>
            <p className={styles.muted}>
              Permissions, consent and capability suspension are managed in Trust &amp;
              Permissions.
            </p>
            <Link href="/permissions" className={styles.secondaryLink}>
              Open Trust &amp; Permissions
            </Link>
          </section>
        </>
      ) : null}

      {selectedId && tenantId ? (
        <BusinessResponsibilityDetail
          organizationId={tenantId}
          responsibilityId={selectedId}
          capabilities={capabilities}
          onClose={() => setSelectedId(null)}
          onChanged={onChanged}
        />
      ) : null}
    </section>
  );
}

interface OwnerSectionProps {
  id: string;
  heading: string;
  rows: BusinessResponsibilityDto[];
  emptyMessage: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
  emphasis?: boolean;
  showOutcome?: boolean;
}

function OwnerSection({
  id,
  heading,
  rows,
  emptyMessage,
  onSelect,
  selectedId,
  emphasis,
  showOutcome,
}: OwnerSectionProps) {
  return (
    <section
      className={emphasis ? `${styles.section} ${styles.sectionEmphasis}` : styles.section}
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`} className={styles.sectionHeading}>
        {heading}
        {rows.length > 0 ? <span className={styles.count}>{rows.length}</span> : null}
      </h2>

      {rows.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => {
            const { promise } = promiseOf(row);
            // Outcome language for closed work comes from the same evidence
            // fields the canonical receipt exposes — never from status alone.
            const outcome = showOutcome
              ? describeCompletion({ status: row.status, lifecycle: row.events })
              : null;
            return (
              <li key={row.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowButton}
                  aria-expanded={selectedId === row.id}
                  onClick={() => onSelect(row.id)}
                >
                  <span className={styles.objective}>{row.objective}</span>
                  {promise ? <span className={styles.promise}>{promise}</span> : null}
                  <span className={styles.state}>
                    {outcome ? outcome.headline : statusLabel(row.status)}
                  </span>
                  {outcome ? <span className={styles.outcomeDetail}>{outcome.detail}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
