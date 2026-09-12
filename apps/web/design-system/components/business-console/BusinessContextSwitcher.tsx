'use client';

import Link from 'next/link';
import { useBusiness } from '../../../state';
import { V1_FEATURE_FLAGS } from '../../../lib/config/v1-feature-scope';
import styles from './BusinessContextSwitcher.module.css';

/**
 * Step 1 — Business Identity & Boundary §6 (context switching) and §2
 * (a person may belong to multiple organizations). The smallest coherent
 * switcher: Personal, every company the member belongs to, and Academy —
 * with the currently active company visually unambiguous, so the mental
 * model holds: "I am still me. I am currently working inside this
 * organization." Not final visual polish (§6 explicitly allows that to
 * wait) — just correct, unambiguous state.
 */
export function BusinessContextSwitcher() {
  const { state, activeTenant, selectTenant } = useBusiness();

  if (state.tenants.length === 0 && state.invitations.length === 0) {
    return null;
  }

  return (
    <nav className={styles.switcher} aria-label="Aureus context">
      <Link href="/home" className={styles.pill}>
        Personal
      </Link>

      {state.tenants.map((tenant) => {
        const isActive = tenant.id === activeTenant?.id;
        return (
          <button
            key={tenant.id}
            type="button"
            className={isActive ? `${styles.pill} ${styles.pillActive}` : styles.pill}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => selectTenant(tenant.id)}
          >
            {tenant.name}
          </button>
        );
      })}

      {V1_FEATURE_FLAGS.academy ? (
        <Link href="/academy" className={styles.pill}>
          Academy
        </Link>
      ) : null}

      {state.invitations.length > 0 ? (
        <Link href="/business/invitations" className={styles.pill}>
          Invitations
          <span className={styles.badge}>{state.invitations.length}</span>
        </Link>
      ) : null}

      {activeTenant ? (
        <p className={styles.currentLabel}>
          You are currently working inside <strong>{activeTenant.name}</strong>.
        </p>
      ) : null}
    </nav>
  );
}
