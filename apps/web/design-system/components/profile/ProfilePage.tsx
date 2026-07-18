'use client';

import { useEffect, useState } from 'react';
import { useProfile, useSession } from '../../../state';
import type { UpdateProfileInput } from '../../../lib/api/profile';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { FormField } from '../FormField/FormField';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './ProfilePage.module.css';

const SEASONS_OF_LIFE = [
  { value: '', label: 'Prefer not to say' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'EARLY_CAREER', label: 'Early career' },
  { value: 'YOUNG_FAMILY', label: 'Young family' },
  { value: 'ESTABLISHED_CAREER', label: 'Established career' },
  { value: 'MID_LIFE_TRANSITION', label: 'Mid-life transition' },
  { value: 'EMPTY_NEST', label: 'Empty nest' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'OTHER', label: 'Other' },
];

function emptyForm(): UpdateProfileInput {
  return {
    displayName: '', bio: '', avatarUrl: '', city: '', region: '', stateProvince: '', country: '',
    localAreaDescription: '', profession: '', seasonOfLife: '', availabilityNotes: '', preferredLanguage: '',
    faithPreference: '',
  };
}

/**
 * The standing Profile surface (PR-002) — full read/create/update over
 * the existing backend contract (`apps/api/src/users/profile`). Every
 * field is optional and member-owned (WO-030 Founder Decisions #7-#9):
 * the Institution learns because the member chooses to share, never
 * because a field is required.
 */
export function ProfilePage() {
  const { session } = useSession();
  const { state, load, save, clearError } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfileInput>(emptyForm());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!session.isAuthenticated) {
    return <EmptyState title="Sign in to view your profile" description="Sign in to view and edit your profile." />;
  }

  const startEditing = () => {
    setForm({
      displayName: state.profile?.displayName ?? '',
      bio: state.profile?.bio ?? '',
      avatarUrl: state.profile?.avatarUrl ?? '',
      city: state.profile?.city ?? '',
      region: state.profile?.region ?? '',
      stateProvince: state.profile?.stateProvince ?? '',
      country: state.profile?.country ?? '',
      localAreaDescription: state.profile?.localAreaDescription ?? '',
      profession: state.profile?.profession ?? '',
      seasonOfLife: state.profile?.seasonOfLife ?? '',
      availabilityNotes: state.profile?.availabilityNotes ?? '',
      preferredLanguage: state.profile?.preferredLanguage ?? '',
      faithPreference: state.profile?.faithPreference ?? '',
    });
    clearError();
    setIsEditing(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input: UpdateProfileInput = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== ''),
    );
    await save(input);
    setIsEditing(false);
  };

  const errorCopy = state.error ? domainErrorCopy(state.error.kind) : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        {!isEditing ? (
          <Button variant="secondary" onClick={startEditing}>
            {state.profile ? 'Edit profile' : 'Create profile'}
          </Button>
        ) : null}
      </div>

      {state.isLoading && !state.profile ? <LoadingState label="Loading profile" /> : null}

      {errorCopy && !isEditing ? <ErrorState title={errorCopy.title} description={errorCopy.description} /> : null}

      {!isEditing && !state.isLoading && !state.profile && !state.error ? (
        <EmptyState
          title="You haven't set up a profile yet"
          description="A profile helps your Steward and your Pod get to know you a little — everything is optional."
          action={<Button onClick={startEditing}>Create profile</Button>}
        />
      ) : null}

      {!isEditing && state.profile ? (
        <Card className={styles.card}>
          <dl className={styles.details}>
            <ProfileDetail label="Display name" value={state.profile.displayName} />
            <ProfileDetail label="Bio" value={state.profile.bio} />
            <ProfileDetail label="Profession" value={state.profile.profession} />
            <ProfileDetail
              label="Season of life"
              value={SEASONS_OF_LIFE.find((s) => s.value === state.profile?.seasonOfLife)?.label ?? null}
            />
            <ProfileDetail
              label="Location"
              value={[state.profile.city, state.profile.region, state.profile.stateProvince, state.profile.country]
                .filter(Boolean)
                .join(', ') || null}
            />
            <ProfileDetail label="Local area" value={state.profile.localAreaDescription} />
            <ProfileDetail label="Availability" value={state.profile.availabilityNotes} />
            <ProfileDetail label="Preferred language" value={state.profile.preferredLanguage} />
            <ProfileDetail label="Faith preference" value={state.profile.faithPreference} />
          </dl>
        </Card>
      ) : null}

      {isEditing ? (
        <Card className={styles.card}>
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            {errorCopy ? <ErrorState title={errorCopy.title} description={errorCopy.description} /> : null}

            <FormField
              id="profile-display-name"
              label="Display name"
              value={form.displayName ?? ''}
              onChange={(value) => setForm((f) => ({ ...f, displayName: value }))}
              maxLength={100}
            />

            <label className={styles.textareaField} htmlFor="profile-bio">
              <span className={styles.label}>Bio</span>
              <textarea
                id="profile-bio"
                className={styles.textarea}
                value={form.bio ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, bio: event.target.value }))}
                maxLength={500}
                rows={3}
              />
            </label>

            <FormField
              id="profile-profession"
              label="Profession"
              value={form.profession ?? ''}
              onChange={(value) => setForm((f) => ({ ...f, profession: value }))}
              maxLength={150}
            />

            <label className={styles.field} htmlFor="profile-season-of-life">
              <span className={styles.label}>Season of life</span>
              <select
                id="profile-season-of-life"
                className={styles.select}
                value={form.seasonOfLife ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, seasonOfLife: event.target.value }))}
              >
                {SEASONS_OF_LIFE.map((season) => (
                  <option key={season.value} value={season.value}>
                    {season.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.row}>
              <FormField
                id="profile-city"
                label="City"
                value={form.city ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, city: value }))}
                maxLength={100}
              />
              <FormField
                id="profile-region"
                label="Region"
                value={form.region ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, region: value }))}
                maxLength={100}
              />
            </div>

            <div className={styles.row}>
              <FormField
                id="profile-state-province"
                label="State / Province"
                value={form.stateProvince ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, stateProvince: value }))}
                maxLength={100}
              />
              <FormField
                id="profile-country"
                label="Country"
                value={form.country ?? ''}
                onChange={(value) => setForm((f) => ({ ...f, country: value }))}
                maxLength={100}
              />
            </div>

            <label className={styles.textareaField} htmlFor="profile-local-area">
              <span className={styles.label}>Local area description</span>
              <textarea
                id="profile-local-area"
                className={styles.textarea}
                value={form.localAreaDescription ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, localAreaDescription: event.target.value }))}
                maxLength={500}
                rows={2}
              />
            </label>

            <label className={styles.textareaField} htmlFor="profile-availability">
              <span className={styles.label}>Availability notes</span>
              <textarea
                id="profile-availability"
                className={styles.textarea}
                value={form.availabilityNotes ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, availabilityNotes: event.target.value }))}
                maxLength={500}
                rows={2}
              />
            </label>

            <FormField
              id="profile-preferred-language"
              label="Preferred language"
              value={form.preferredLanguage ?? ''}
              onChange={(value) => setForm((f) => ({ ...f, preferredLanguage: value }))}
              maxLength={100}
            />

            <FormField
              id="profile-faith-preference"
              label="Faith preference"
              helpText="Voluntary only — never required."
              value={form.faithPreference ?? ''}
              onChange={(value) => setForm((f) => ({ ...f, faithPreference: value }))}
              maxLength={200}
            />

            <div className={styles.actions}>
              <Button type="submit" disabled={state.isSaving}>
                {state.isSaving ? 'Saving…' : 'Save profile'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} disabled={state.isSaving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className={styles.detail}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={styles.detailValue}>{value}</dd>
    </div>
  );
}
