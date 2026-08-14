'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getBusinessConsole,
  listMyBusinessTenants,
  updateBusinessProfile,
  type BusinessConsole,
} from '../../../lib/api/business-console';
import { useSession } from '../../../state';
import { businessOnboardingStep } from './onboarding-progress';
import styles from './BusinessConsoleHome.module.css';

interface FormState {
  slug: string;
  cities: string;
  hours: string;
  contactType: 'PHONE' | 'SMS' | 'EMAIL' | 'WEBSITE';
  contactValue: string;
  escalationEmail: string;
}

const EMPTY_FORM: FormState = {
  slug: '',
  cities: '',
  hours: '',
  contactType: 'PHONE',
  contactValue: '',
  escalationEmail: '',
};

export function BusinessConsoleHome() {
  const { session } = useSession();
  const [consoleData, setConsoleData] = useState<BusinessConsole | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'saving' | 'saved' | 'error'>('loading');
  const [error, setError] = useState('');

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
        const data = await getBusinessConsole(session.accessToken!, tenants[0].id);
        if (!active) return;
        setConsoleData(data);
        const profile = data.profile;
        setForm({
          slug: profile?.publicSlug ?? '',
          cities: profile?.serviceArea.cities?.join(', ') ?? '',
          hours: profile?.businessHours.summary ?? '',
          contactType: profile?.contactRoutes[0]?.type ?? 'PHONE',
          contactValue: profile?.contactRoutes[0]?.value ?? '',
          escalationEmail: profile?.escalationTarget?.email ?? '',
        });
        setState('ready');
      })
      .catch(() => {
        if (active) {
          setError('We could not load the business console. Please try again.');
          setState('error');
        }
      });

    return () => {
      active = false;
    };
  }, [session.accessToken]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session.accessToken || !consoleData || !consoleData.canManage) return;
    setState('saving');
    setError('');

    try {
      const step = businessOnboardingStep(form);
      const profile = await updateBusinessProfile(session.accessToken, consoleData.tenantId, {
        publicSlug: form.slug || undefined,
        publicStatus: consoleData.profile?.publicStatus ?? 'PRIVATE',
        serviceArea: {
          cities: form.cities.split(',').map((city) => city.trim()).filter(Boolean),
        },
        businessHours: { summary: form.hours },
        contactRoutes: form.contactValue
          ? [{ type: form.contactType, value: form.contactValue }]
          : [],
        escalationTarget: form.escalationEmail ? { email: form.escalationEmail } : undefined,
        onboardingStep: step,
      });
      setConsoleData((current) => current ? { ...current, profile } : current);
      setState('saved');
    } catch {
      setError('Nothing was published. Check each field and try saving again.');
      setState('error');
    }
  };

  if (state === 'loading') {
    return <section className={styles.surface} aria-busy="true"><p>Opening your business workspace…</p></section>;
  }

  if (state === 'empty') {
    return (
      <section className={styles.surface}>
        <p className={styles.eyebrow}>Business console</p>
        <h1>No business workspace yet</h1>
        <p>An Aureus steward can connect your verified business organization. No public profile is created automatically.</p>
      </section>
    );
  }

  if (!consoleData) {
    return (
      <section className={styles.surface} role="alert">
        <h1>Business console unavailable</h1>
        <p>{error}</p>
      </section>
    );
  }

  const currentStep = consoleData.profile?.onboardingStep ?? businessOnboardingStep(form);

  return (
    <section className={styles.surface}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Business console</p>
          <h1>{consoleData.organization.name}</h1>
          <p>Set up how people find you, reach you, and get a human when they need one.</p>
        </div>
        <div className={styles.status} aria-label={`Onboarding step ${currentStep} of 5`}>
          <strong>{currentStep}/5</strong>
          <span>{consoleData.profile?.publicStatus ?? 'PRIVATE'}</span>
        </div>
      </header>

      <Link href="/business/knowledge" className={styles.knowledgeLink}>
        <span>
          <strong>Business knowledge</strong>
          <small>Services, FAQs, policies, pricing boundaries, geography, qualification, and escalation.</small>
        </span>
        <span aria-hidden="true">→</span>
      </Link>

      <form className={styles.form} onSubmit={(event) => void save(event)}>
        <fieldset disabled={!consoleData.canManage || state === 'saving'}>
          <legend>Business profile and routing</legend>

          <label>
            Public address
            <span className={styles.hint}>Lowercase words joined with hyphens</span>
            <input
              value={form.slug}
              onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))}
              placeholder="river-city-kitchens"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            />
          </label>

          <label>
            Service cities
            <span className={styles.hint}>Separate multiple cities with commas</span>
            <input
              value={form.cities}
              onChange={(event) => setForm((value) => ({ ...value, cities: event.target.value }))}
              placeholder="Dayton, Kettering, Oakwood"
            />
          </label>

          <label>
            Business hours
            <input
              value={form.hours}
              onChange={(event) => setForm((value) => ({ ...value, hours: event.target.value }))}
              placeholder="Monday–Friday, 8:00 AM–6:00 PM"
            />
          </label>

          <div className={styles.route}>
            <label>
              Contact route
              <select
                value={form.contactType}
                onChange={(event) => setForm((value) => ({
                  ...value,
                  contactType: event.target.value as FormState['contactType'],
                }))}
              >
                <option value="PHONE">Phone</option>
                <option value="SMS">Text message</option>
                <option value="EMAIL">Email</option>
                <option value="WEBSITE">Website</option>
              </select>
            </label>
            <label>
              Route value
              <input
                value={form.contactValue}
                onChange={(event) => setForm((value) => ({ ...value, contactValue: event.target.value }))}
                placeholder="+1 937 555 0144"
              />
            </label>
          </div>

          <label>
            Human escalation email
            <span className={styles.hint}>Where Aureus should hand off an unresolved or sensitive request</span>
            <input
              type="email"
              value={form.escalationEmail}
              onChange={(event) => setForm((value) => ({ ...value, escalationEmail: event.target.value }))}
              placeholder="help@business.example"
            />
          </label>
        </fieldset>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {state === 'saved' ? <p className={styles.saved} role="status">Saved. Nothing is published without an explicit publish step.</p> : null}

        <button type="submit" disabled={!consoleData.canManage || state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save business setup'}
        </button>
      </form>
    </section>
  );
}
