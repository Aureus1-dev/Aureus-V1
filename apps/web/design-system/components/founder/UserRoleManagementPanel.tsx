'use client';

import { useEffect, useState } from 'react';
import { useFounder } from '../../../state';
import type { UserRole, UserStatus } from '../../../lib/api/users';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { VisuallyHidden } from '../../accessibility';
import styles from './UserRoleManagementPanel.module.css';

const ROLES: UserRole[] = [
  'MEMBER', 'STEWARD', 'ORGANIZATION_REPRESENTATIVE', 'BUSINESS_REPRESENTATIVE',
  'PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR', 'AI_SERVICE_ACCOUNT',
];
const STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

/**
 * The Founder Operating System's User & Role Management panel (PR-003) —
 * lists members with an optional role/status filter, and grants/revokes
 * roles or changes status directly against `UserRolesService` /
 * `UsersService` (WO-021, no new backend surface needed).
 */
export function UserRoleManagementPanel() {
  const { state, loadUsers, updateUser, grantRole, revokeRole } = useFounder();
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [roleToGrant, setRoleToGrant] = useState<Record<string, UserRole>>({});

  useEffect(() => {
    void loadUsers({
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      limit: 50,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadUsers, roleFilter, statusFilter]);

  if (state.isLoadingUsers && state.users.length === 0) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing user & role management" />
      </div>
    );
  }

  if (state.error && state.users.length === 0) {
    return (
      <ErrorState
        title="Members couldn't be loaded"
        description={state.error.message}
        action={state.error.retryable ? <Button onClick={() => void loadUsers()}>Try again</Button> : undefined}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>User & Role Management</h1>
      <p className={styles.intro}>{state.usersTotal ?? state.users.length} members</p>

      <div className={styles.filters}>
        <label className={styles.filterField}>
          <span>Role</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}>
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as UserStatus | '')}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.users.length === 0 ? (
        <EmptyState title="No members match" description="Try a different role or status filter." />
      ) : (
        <ul className={styles.list}>
          {state.users.map((user) => {
            const isSaving = state.updatingUserId === user.id;
            const grantableRoles = ROLES.filter((role) => !user.roles.includes(role));
            const selectedRoleToGrant = roleToGrant[user.id] ?? grantableRoles[0];

            return (
              <li key={user.id}>
                <Card className={styles.userCard}>
                  <div className={styles.userHeader}>
                    <span className={styles.userEmail}>{user.email}</span>
                    <label className={styles.statusField}>
                      <VisuallyHidden>Status for {user.email}</VisuallyHidden>
                      <select
                        value={user.status}
                        disabled={isSaving}
                        onChange={(event) => void updateUser(user.id, { status: event.target.value as UserStatus })}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <ul className={styles.roleBadges}>
                    {user.roles.map((role) => (
                      <li key={role} className={styles.roleBadge}>
                        {role}
                        <button
                          type="button"
                          className={styles.revokeButton}
                          disabled={isSaving || user.roles.length <= 1}
                          aria-label={`Revoke ${role} from ${user.email}`}
                          onClick={() => void revokeRole(user.id, role)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>

                  {grantableRoles.length > 0 ? (
                    <div className={styles.grantRow}>
                      <label htmlFor={`grant-role-${user.id}`}>
                        <VisuallyHidden>Grant a role to {user.email}</VisuallyHidden>
                      </label>
                      <select
                        id={`grant-role-${user.id}`}
                        value={selectedRoleToGrant}
                        onChange={(event) =>
                          setRoleToGrant((previous) => ({ ...previous, [user.id]: event.target.value as UserRole }))
                        }
                      >
                        {grantableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => void grantRole(user.id, selectedRoleToGrant)}
                      >
                        Grant
                      </Button>
                    </div>
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
