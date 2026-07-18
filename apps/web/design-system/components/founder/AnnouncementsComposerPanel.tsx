'use client';

import { useEffect, useState } from 'react';
import { useAnnouncements } from '../../../state';
import type { AnnouncementScope, AnnouncementStatus } from '../../../lib/api/announcements';
import type { UserRole } from '../../../lib/api/users';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { FormField } from '../FormField/FormField';
import styles from './AnnouncementsComposerPanel.module.css';

const SCOPES: AnnouncementScope[] = ['PLATFORM', 'ORGANIZATION', 'ROLE', 'STEWARD_MEMBERS'];
const TARGET_ROLES: UserRole[] = [
  'MEMBER', 'STEWARD', 'ORGANIZATION_REPRESENTATIVE', 'BUSINESS_REPRESENTATIVE',
  'PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR',
];

const ACTIVE_STATUSES: AnnouncementStatus[] = ['DRAFT', 'SCHEDULED', 'PUBLISHED'];

/**
 * The Founder Operating System's Announcements composer (PR-003) — the
 * full create → publish → archive lifecycle `AnnouncementsService` has
 * supported since PR-002, with no prior frontend surface. Publishing fans
 * out one notification per resolved recipient server-side; this panel
 * only needs to trigger it.
 */
export function AnnouncementsComposerPanel() {
  const { state, load, create, publish, archive } = useAnnouncements();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<AnnouncementScope>('PLATFORM');
  const [targetRole, setTargetRole] = useState<UserRole>('MEMBER');
  const [organizationId, setOrganizationId] = useState('');
  const [stewardId, setStewardId] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await create({
      title,
      body,
      scope,
      isCritical,
      targetRole: scope === 'ROLE' ? targetRole : undefined,
      organizationId: scope === 'ORGANIZATION' ? organizationId : undefined,
      stewardId: scope === 'STEWARD_MEMBERS' ? stewardId : undefined,
    });
    setTitle('');
    setBody('');
    setIsCritical(false);
  }

  if (state.isLoading && state.announcements.length === 0) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing announcements" />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>Announcements</h1>
      <p className={styles.intro}>Compose, publish, and archive platform-wide, organization, role, or steward-audience notices.</p>

      {state.error ? (
        <ErrorState
          title="Something went wrong"
          description={state.error.message}
          action={state.error.retryable ? <Button onClick={() => void load()}>Try again</Button> : undefined}
        />
      ) : null}

      <Card className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField id="announcement-title" label="Title" value={title} onChange={setTitle} required minLength={1} maxLength={200} />
          <label className={styles.bodyField} htmlFor="announcement-body">
            Body
            <textarea
              id="announcement-body"
              className={styles.bodyInput}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={1}
              maxLength={5000}
              required
            />
          </label>

          <label className={styles.selectField}>
            <span>Scope</span>
            <select value={scope} onChange={(event) => setScope(event.target.value as AnnouncementScope)}>
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {scope === 'ROLE' ? (
            <label className={styles.selectField}>
              <span>Target role</span>
              <select value={targetRole} onChange={(event) => setTargetRole(event.target.value as UserRole)}>
                {TARGET_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === 'ORGANIZATION' ? (
            <FormField id="announcement-organization" label="Organization UUID" value={organizationId} onChange={setOrganizationId} required />
          ) : null}

          {scope === 'STEWARD_MEMBERS' ? (
            <FormField id="announcement-steward" label="Steward UUID" value={stewardId} onChange={setStewardId} required />
          ) : null}

          <label className={styles.checkboxField}>
            <input type="checkbox" checked={isCritical} onChange={(event) => setIsCritical(event.target.checked)} />
            <span>Critical — bypasses recipient notification preferences on publish</span>
          </label>

          <Button type="submit" disabled={state.isSaving}>
            {state.isSaving ? 'Creating…' : 'Create draft'}
          </Button>
        </form>
      </Card>

      {state.announcements.length === 0 ? (
        <EmptyState title="No announcements yet" description="Create the first one above." />
      ) : (
        <ul className={styles.list}>
          {state.announcements.map((announcement) => {
            const isSaving = state.savingId === announcement.id;
            return (
              <li key={announcement.id}>
                <Card className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemTitle}>{announcement.title}</span>
                    <span className={styles.statusBadge}>{announcement.status}</span>
                  </div>
                  <p className={styles.itemBody}>{announcement.body}</p>
                  <p className={styles.itemMeta}>
                    {announcement.scope}
                    {announcement.isCritical ? ' · Critical' : ''}
                  </p>
                  {ACTIVE_STATUSES.includes(announcement.status) && announcement.status !== 'PUBLISHED' ? (
                    <div className={styles.actions}>
                      <Button type="button" disabled={isSaving} onClick={() => void publish(announcement.id)}>
                        {isSaving ? 'Publishing…' : 'Publish'}
                      </Button>
                    </div>
                  ) : null}
                  {announcement.status !== 'ARCHIVED' ? (
                    <div className={styles.actions}>
                      <Button type="button" variant="secondary" disabled={isSaving} onClick={() => void archive(announcement.id)}>
                        {isSaving ? 'Archiving…' : 'Archive'}
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
