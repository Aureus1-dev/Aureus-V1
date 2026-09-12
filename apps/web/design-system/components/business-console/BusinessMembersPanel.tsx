'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBusinessConsole, type BusinessConsole } from '../../../lib/api/business-console';
import {
  inviteMember,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  transferOwnership,
  updateMemberRole,
  type OrganizationInvitation,
  type OrganizationMember,
  type OrganizationMemberRole,
} from '../../../lib/api/organizations';
import { useBusiness, useSession } from '../../../state';
import styles from './BusinessMembersPanel.module.css';

const INVITABLE_ROLES: OrganizationMemberRole[] = [
  'ADMIN',
  'MANAGER',
  'OPERATOR',
  'VIEWER',
  'MEMBER',
];

export function BusinessMembersPanel() {
  const { session } = useSession();
  const { activeTenant } = useBusiness();
  const [consoleData, setConsoleData] = useState<BusinessConsole | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationMemberRole>('MEMBER');
  const [transferTargetId, setTransferTargetId] = useState('');

  const canManage = consoleData?.canManage ?? false;
  const isOwner = consoleData?.membershipRole === 'OWNER';

  const refresh = useCallback(async () => {
    if (!session.accessToken || !activeTenant) return;
    const accessToken = session.accessToken;
    setStatus('loading');
    setError('');
    try {
      const [console_, memberList] = await Promise.all([
        getBusinessConsole(accessToken, activeTenant.id),
        listMembers(accessToken, activeTenant.id),
      ]);
      setConsoleData(console_);
      setMembers(memberList);
      setInvitations(console_.canManage ? await listInvitations(accessToken, activeTenant.id) : []);
      setStatus('ready');
    } catch {
      setError('We could not load company members. Please try again.');
      setStatus('error');
    }
  }, [session.accessToken, activeTenant]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const withBusy = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  if (!activeTenant) return null;

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session.accessToken || !inviteEmail.trim()) return;
    await withBusy('invite', async () => {
      await inviteMember(session.accessToken!, activeTenant.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
    });
  };

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session.accessToken || !transferTargetId) return;
    await withBusy('transfer', async () => {
      await transferOwnership(session.accessToken!, activeTenant.id, transferTargetId);
      setTransferTargetId('');
    });
  };

  return (
    <section className={styles.surface}>
      <p className={styles.eyebrow}>Members</p>
      <h2>{activeTenant.name}</h2>
      <p className={styles.hint}>
        People with access to this company&apos;s Business context. Removing someone here never
        affects their personal Aureus account.
      </p>

      {status === 'loading' ? <p>Loading members…</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {status === 'ready' ? (
        <>
          <ul className={styles.list}>
            {members.map((member) => {
              const isSelf = member.userId === session.memberId;
              const canRemove = canManage || isSelf;
              return (
                <li key={member.id} className={styles.row}>
                  <div className={styles.rowIdentity}>
                    <code>{member.userId}</code>
                    <span className={styles.roleBadge}>{member.role}</span>
                  </div>
                  <div className={styles.rowActions}>
                    {canManage && member.role !== 'OWNER' ? (
                      <select
                        aria-label={`Change role for ${member.userId}`}
                        value={member.role}
                        disabled={busyId === member.id}
                        onChange={(event) => {
                          const role = event.target.value as OrganizationMemberRole;
                          void withBusy(member.id, () =>
                            updateMemberRole(
                              session.accessToken!,
                              activeTenant.id,
                              member.userId,
                              role,
                            ).then(() => undefined),
                          );
                        }}
                      >
                        {INVITABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {canRemove ? (
                      <button
                        type="button"
                        className={styles.button}
                        disabled={busyId === member.id}
                        onClick={() =>
                          void withBusy(member.id, () =>
                            removeMember(session.accessToken!, activeTenant.id, member.userId),
                          )
                        }
                      >
                        {isSelf ? 'Leave' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {canManage ? (
            <>
              <h3>Invite someone</h3>
              <form className={styles.form} onSubmit={(event) => void submitInvite(event)}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="employee@example.com"
                  />
                </label>
                <label>
                  Role
                  <select
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value as OrganizationMemberRole)
                    }
                  >
                    {INVITABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={busyId === 'invite'}
                >
                  {busyId === 'invite' ? 'Sending…' : 'Send invitation'}
                </button>
              </form>

              {invitations.length > 0 ? (
                <>
                  <h3>Pending invitations</h3>
                  <ul className={styles.list}>
                    {invitations.map((invitation) => (
                      <li key={invitation.id} className={styles.row}>
                        <div className={styles.rowIdentity}>
                          <span>{invitation.invitedEmail}</span>
                          <span className={styles.roleBadge}>{invitation.status}</span>
                        </div>
                        {invitation.status === 'PENDING' ? (
                          <button
                            type="button"
                            className={styles.button}
                            disabled={busyId === invitation.id}
                            onClick={() =>
                              void withBusy(invitation.id, () =>
                                revokeInvitation(
                                  session.accessToken!,
                                  activeTenant.id,
                                  invitation.id,
                                ),
                              )
                            }
                          >
                            Revoke
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}

          {isOwner ? (
            <>
              <h3>Transfer ownership</h3>
              <p className={styles.hint}>
                Ownership is separate from ordinary roles. Transfer OWNER to another current member;
                prior ownership is removed atomically so the company finishes with one owner.
              </p>
              <form className={styles.form} onSubmit={(event) => void submitTransfer(event)}>
                <label>
                  New owner
                  <select
                    required
                    value={transferTargetId}
                    onChange={(event) => setTransferTargetId(event.target.value)}
                  >
                    <option value="" disabled>
                      Choose a member
                    </option>
                    {members
                      .filter((member) => member.userId !== session.memberId)
                      .map((member) => (
                        <option key={member.id} value={member.userId}>
                          {member.userId}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={busyId === 'transfer' || !transferTargetId}
                >
                  {busyId === 'transfer' ? 'Transferring…' : 'Transfer ownership'}
                </button>
              </form>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
