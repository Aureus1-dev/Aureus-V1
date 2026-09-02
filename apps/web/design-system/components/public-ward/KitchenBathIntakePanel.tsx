'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createKitchenBathHandoff,
  getKitchenBathPack,
  type KitchenBathBudgetRange,
  type KitchenBathDecisionStatus,
  type KitchenBathPriority,
  type KitchenBathProjectType,
  type KitchenBathReadyProject,
} from '../../../lib/api/kitchen-bath';
import {
  getPublicWard,
  type PublicWardProfile,
  type WardLeadContactMethod,
  type WardLeadDesiredTiming,
} from '../../../lib/api/public-ward';
import { KitchenBathReadyProjectCard } from './KitchenBathReadyProjectCard';
import styles from './KitchenBathIntakePanel.module.css';

interface StoredWardSession {
  conversationId: string;
  accessToken: string;
}

const storageKey = (slug: string) => `aureus:ward:${slug}`;

function sessionFor(slug: string): StoredWardSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWardSession>;
    return typeof parsed.conversationId === 'string' && typeof parsed.accessToken === 'string'
      ? { conversationId: parsed.conversationId, accessToken: parsed.accessToken }
      : null;
  } catch {
    return null;
  }
}

export function KitchenBathIntakePanel({ slug }: { slug: string }) {
  const [active, setActive] = useState(false);
  const [profile, setProfile] = useState<PublicWardProfile | null>(null);
  const [boundary, setBoundary] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'sending' | 'sent' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [readyProject, setReadyProject] =
    useState<KitchenBathReadyProject | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    contactMethod: 'EMAIL' as WardLeadContactMethod,
    contactValue: '',
    projectType: 'KITCHEN' as KitchenBathProjectType,
    rooms: '',
    scope: '',
    projectLocation: '',
    desiredTiming: '' as WardLeadDesiredTiming | '',
    decisionStatus: '' as KitchenBathDecisionStatus | '',
    budgetRange: '' as KitchenBathBudgetRange | '',
    designNeeds: '',
    priorities: [] as KitchenBathPriority[],
    mustHaves: '',
    concerns: '',
    consentGranted: false,
  });

  useEffect(() => {
    let mounted = true;
    void Promise.all([getKitchenBathPack(slug), getPublicWard(slug)])
      .then(([pack, ward]) => {
        if (!mounted) return;
        setActive(pack.active);
        setBoundary(pack.estimationBoundary ?? '');
        setProfile(ward);
        setState('ready');
      })
      .catch(() => {
        if (mounted) setState('error');
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  const togglePriority = (priority: KitchenBathPriority) => {
    setForm((current) => ({
      ...current,
      priorities: current.priorities.includes(priority)
        ? current.priorities.filter((item) => item !== priority)
        : current.priorities.length < 6
          ? [...current.priorities, priority]
          : current.priorities,
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const session = sessionFor(slug);
    if (!session || !profile) {
      setMessage('Ask the Ward at least one question first so this project can stay attached to the same private conversation.');
      setState('error');
      return;
    }
    const rooms = form.rooms.split(',').map((room) => room.trim()).filter(Boolean).slice(0, 8);
    if (rooms.length === 0 || form.scope.trim().length < 10 || !form.consentGranted) return;

    setState('sending');
    setMessage('');
    try {
      const result = await createKitchenBathHandoff(
        slug,
        session.conversationId,
        session.accessToken,
        {
        displayName: form.displayName,
        contactMethod: form.contactMethod,
        contactValue: form.contactValue,
        projectSummary: form.scope,
        ...(form.projectLocation && { projectLocation: form.projectLocation }),
        ...(form.desiredTiming && { desiredTiming: form.desiredTiming }),
        kitchenBath: {
          projectType: form.projectType,
          rooms,
          scope: form.scope,
          ...(form.decisionStatus && { decisionStatus: form.decisionStatus }),
          ...(form.budgetRange && { budgetRange: form.budgetRange }),
          ...(form.designNeeds && { designNeeds: form.designNeeds }),
          ...(form.priorities.length && { priorities: form.priorities }),
          ...(form.mustHaves && { mustHaves: form.mustHaves }),
          ...(form.concerns && { concerns: form.concerns }),
        },
        consentVersion: profile.handoff.consentVersion,
        consentTextSha256: profile.handoff.consentTextSha256,
        consentGranted: true,
      },
      );
      setReadyProject(result.readyProject);
      setMessage(
        'Your remodel request was shared with the business, and Aureus organized the project context for expert review.',
      );
      setState('sent');
    } catch {
      setMessage('The remodel handoff was not created. Nothing new was shared. Ask the Ward a question first, then review the form and try again.');
      setState('error');
    }
  };

  if (state === 'loading' || !active) return null;
  if (!profile) return null;
  if (state === 'sent') {
    return (
      <section className={styles.panel} role="status">
        <p className={styles.success}>{message}</p>
        {readyProject ? (
          <KitchenBathReadyProjectCard project={readyProject} />
        ) : (
          <p className={styles.note}>
            The handoff was shared, but Aureus could not reconstruct a Ready
            Project from the retained source. Nothing was guessed.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="kitchen-bath-intake-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Kitchen & Bath project intake</p>
        <h2 id="kitchen-bath-intake-title">Give the team useful project context</h2>
        <p>
          Tell Aureus what you are trying to make true. We will organize your
          answers into a Ready Project for the business expert — not a hidden
          qualification score.
        </p>
      </header>
      <p className={styles.boundary}>{boundary}</p>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <div className={styles.grid}>
          <label>Your name<input required maxLength={120} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
          <label>Preferred contact<select value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value as WardLeadContactMethod, contactValue: '' })}><option value="EMAIL">Email</option><option value="PHONE">Phone call</option><option value="SMS">Text</option></select></label>
          <label>{form.contactMethod === 'EMAIL' ? 'Email address' : 'Phone number'}<input required type={form.contactMethod === 'EMAIL' ? 'email' : 'tel'} maxLength={320} value={form.contactValue} onChange={(e) => setForm({ ...form, contactValue: e.target.value })} /></label>
          <label>Project type<select value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value as KitchenBathProjectType })}><option value="KITCHEN">Kitchen</option><option value="BATHROOM">Bathroom</option><option value="KITCHEN_AND_BATH">Kitchen and bath</option><option value="OTHER_REMODELING">Other remodeling</option></select></label>
          <label>Rooms <span>(comma separated)</span><input required maxLength={300} placeholder="Kitchen, primary bathroom" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} /></label>
          <label>Project location <span>(optional)</span><input maxLength={200} value={form.projectLocation} onChange={(e) => setForm({ ...form, projectLocation: e.target.value })} /></label>
          <label>Desired timing <span>(optional)</span><select value={form.desiredTiming} onChange={(e) => setForm({ ...form, desiredTiming: e.target.value as WardLeadDesiredTiming | '' })}><option value="">Choose only if useful</option><option value="AS_SOON_AS_POSSIBLE">As soon as possible</option><option value="WITHIN_ONE_MONTH">Within one month</option><option value="ONE_TO_THREE_MONTHS">One to three months</option><option value="THREE_TO_SIX_MONTHS">Three to six months</option><option value="EXPLORING">Exploring</option></select></label>
          <label>Ownership / decision status <span>(optional)</span><select value={form.decisionStatus} onChange={(e) => setForm({ ...form, decisionStatus: e.target.value as KitchenBathDecisionStatus | '' })}><option value="">Prefer not to say</option><option value="OWNER_DECISION_MAKER">Owner / decision maker</option><option value="OWNER_WITH_OTHER_DECISION_MAKERS">Owner with other decision makers</option><option value="AUTHORIZED_REPRESENTATIVE">Authorized representative</option><option value="EXPLORING">Exploring</option></select></label>
          <label>Budget range <span>(optional)</span><select value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value as KitchenBathBudgetRange | '' })}><option value="">Skip this</option><option value="UNDER_25000">Under $25,000</option><option value="FROM_25000_TO_50000">$25,000–$50,000</option><option value="FROM_50000_TO_100000">$50,000–$100,000</option><option value="FROM_100000_TO_200000">$100,000–$200,000</option><option value="OVER_200000">Over $200,000</option><option value="UNSURE">Unsure</option></select></label>
          <label className={styles.full}>What are you hoping to change?<textarea required minLength={10} maxLength={1500} rows={4} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} /></label>
          <label className={styles.full}>Design help needed <span>(optional)</span><textarea maxLength={1000} rows={3} value={form.designNeeds} onChange={(e) => setForm({ ...form, designNeeds: e.target.value })} /></label>
          <fieldset className={styles.priorityFieldset}>
            <legend>What matters most? <span>(optional, choose up to 6)</span></legend>
            <div className={styles.priorityGrid}>
              {([
                ['LOOK_AND_FEEL', 'Look & feel'],
                ['FUNCTION_AND_LAYOUT', 'Function & layout'],
                ['DURABILITY', 'Durability'],
                ['BUDGET_CONTROL', 'Budget control'],
                ['TIMING', 'Timing'],
                ['ACCESSIBILITY', 'Accessibility'],
                ['LOW_MAINTENANCE', 'Low maintenance'],
                ['RESALE_VALUE', 'Resale value'],
                ['ENERGY_EFFICIENCY', 'Energy efficiency'],
                ['OTHER', 'Other'],
              ] as const).map(([value, label]) => (
                <label key={value} className={styles.priorityOption}>
                  <input
                    type="checkbox"
                    checked={form.priorities.includes(value)}
                    onChange={() => togglePriority(value)}
                    disabled={
                      !form.priorities.includes(value) &&
                      form.priorities.length >= 6
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className={styles.full}>
            Must-haves <span>(optional)</span>
            <textarea
              maxLength={800}
              rows={2}
              value={form.mustHaves}
              onChange={(e) => setForm({ ...form, mustHaves: e.target.value })}
              placeholder="What would make this project feel right to you?"
            />
          </label>
          <label className={styles.full}>
            Concerns or things to avoid <span>(optional)</span>
            <textarea
              maxLength={800}
              rows={2}
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              placeholder="Anything you do not want lost, repeated, or overlooked?"
            />
          </label>
        </div>
        <p className={styles.note}>Photos/files are supported by the governed intake contract as optional retained project references. This deployment will only present a file picker when its storage adapter is configured; Aureus will not pretend a local browser file was uploaded when it was not.</p>
        <label className={styles.consent}><input type="checkbox" required checked={form.consentGranted} onChange={(e) => setForm({ ...form, consentGranted: e.target.checked })} /><span>{profile.handoff.consentText}</span></label>
        <button className={styles.submit} type="submit" disabled={state === 'sending' || !form.consentGranted}>{state === 'sending' ? 'Sharing…' : 'Share project with the business'}</button>
        {message ? <p className={state === 'error' ? styles.error : styles.note} role={state === 'error' ? 'alert' : 'status'}>{message}</p> : null}
      </form>
    </section>
  );
}
