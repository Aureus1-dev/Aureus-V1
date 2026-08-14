'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createPublicWardHandoff,
  deletePublicWardHandoff,
  resumePublicWardConversation,
  sendPublicWardMessage,
  startPublicWardConversation,
  type PublicWardContact,
  type PublicWardConversation,
  type PublicWardProfile,
  type WardLeadContactMethod,
  type WardLeadDesiredTiming,
} from '../../../lib/api/public-ward';
import styles from './PublicWardExperience.module.css';

interface StoredWardSession {
  conversationId: string;
  accessToken: string;
}

interface PublicWardExperienceProps {
  slug: string;
  embedded?: boolean;
}

const storageKey = (slug: string) => `aureus:ward:${slug}`;

function readStoredSession(slug: string): StoredWardSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredWardSession>;
    return typeof value.conversationId === 'string' && typeof value.accessToken === 'string'
      ? { conversationId: value.conversationId, accessToken: value.accessToken }
      : null;
  } catch {
    return null;
  }
}

function storeSession(slug: string, value: StoredWardSession): void {
  try {
    window.sessionStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // A privacy-restricted browser can still use the active in-memory session.
  }
}

function clearSession(slug: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(slug));
  } catch {
    // Nothing else to clear.
  }
}

function contactHref(contact: PublicWardContact): string {
  if (contact.type === 'EMAIL') return `mailto:${contact.value}`;
  if (contact.type === 'PHONE') return `tel:${contact.value}`;
  if (contact.type === 'SMS') return `sms:${contact.value}`;
  return /^https?:\/\//i.test(contact.value) ? contact.value : `https://${contact.value}`;
}

function contactLabel(contact: PublicWardContact): string {
  if (contact.label) return contact.label;
  if (contact.type === 'EMAIL') return 'Email a person';
  if (contact.type === 'PHONE') return 'Call a person';
  if (contact.type === 'SMS') return 'Text a person';
  return 'Visit the business website';
}

export function PublicWardExperience({ slug, embedded = false }: PublicWardExperienceProps) {
  const [profile, setProfile] = useState<PublicWardProfile | null>(null);
  const [conversation, setConversation] = useState<PublicWardConversation | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'sending' | 'error'>('loading');
  const [error, setError] = useState('');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffError, setHandoffError] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [handoffDraft, setHandoffDraft] = useState({
    displayName: '',
    contactMethod: 'EMAIL' as WardLeadContactMethod,
    contactValue: '',
    projectSummary: '',
    projectLocation: '',
    desiredTiming: '' as WardLeadDesiredTiming | '',
    consentGranted: false,
  });
  const endRef = useRef<HTMLDivElement>(null);

  const primaryContact = useMemo(() => profile?.contactRoutes[0] ?? null, [profile]);

  useEffect(() => {
    let active = true;

    const start = async () => {
      const started = await startPublicWardConversation(slug);
      if (!active) return;
      const token = started.accessToken;
      setAccessToken(token);
      setProfile(started.profile);
      setConversation(started);
      storeSession(slug, { conversationId: started.conversationId, accessToken: token });
      setState('ready');
    };

    const open = async () => {
      const saved = readStoredSession(slug);
      if (!saved) {
        await start();
        return;
      }

      try {
        const resumed = await resumePublicWardConversation(
          slug,
          saved.conversationId,
          saved.accessToken,
        );
        if (!active) return;
        setAccessToken(saved.accessToken);
        setProfile(resumed.profile);
        setConversation(resumed);
        setState('ready');
      } catch {
        clearSession(slug);
        await start();
      }
    };

    void open().catch(() => {
      if (!active) return;
      setError(
        'This Ward is not available right now. You can still contact the business directly.',
      );
      setState('error');
    });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [conversation?.messages.length]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !conversation || !accessToken || state === 'sending') return;

    setState('sending');
    setError('');
    try {
      const result = await sendPublicWardMessage(
        slug,
        conversation.conversationId,
        accessToken,
        content,
      );
      setConversation((current) =>
        current
          ? {
              ...current,
              status: result.status,
              remainingTurns: result.remainingTurns,
              messages: [...current.messages, result.visitorMessage, result.message],
            }
          : current,
      );
      setDraft('');
      setState('ready');
    } catch {
      setError(
        'The Ward could not answer that message. Nothing was sent to the business. Please try again or contact a person.',
      );
      setState('error');
    }
  };

  const submitHandoff = async (event: FormEvent) => {
    event.preventDefault();
    if (!conversation || !accessToken || handoffBusy || !handoffDraft.consentGranted) return;
    setHandoffBusy(true);
    setHandoffError('');
    try {
      const handoff = await createPublicWardHandoff(
        slug,
        conversation.conversationId,
        accessToken,
        {
          displayName: handoffDraft.displayName,
          contactMethod: handoffDraft.contactMethod,
          contactValue: handoffDraft.contactValue,
          projectSummary: handoffDraft.projectSummary,
          ...(handoffDraft.projectLocation && { projectLocation: handoffDraft.projectLocation }),
          ...(handoffDraft.desiredTiming && { desiredTiming: handoffDraft.desiredTiming }),
          consentVersion: profile!.handoff.consentVersion,
          consentTextSha256: profile!.handoff.consentTextSha256,
          consentGranted: true,
        },
      );
      setConversation((current) =>
        current
          ? {
              ...current,
              status: 'ESCALATED',
              handoff,
            }
          : current,
      );
      setHandoffOpen(false);
    } catch {
      setHandoffError(
        'The handoff was not created. Nothing new was shared with the business. Please review the fields or use the direct contact route.',
      );
    } finally {
      setHandoffBusy(false);
    }
  };

  const deleteHandoff = async () => {
    if (!conversation || !accessToken || handoffBusy) return;
    setHandoffBusy(true);
    setHandoffError('');
    try {
      await deletePublicWardHandoff(slug, conversation.conversationId, accessToken);
      clearSession(slug);
      setDeleted(true);
    } catch {
      setHandoffError('We could not delete the handoff right now. Please try again.');
    } finally {
      setHandoffBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <main className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
        <section className={styles.shell} aria-busy="true" aria-label="Opening business Ward">
          <p className={styles.loading}>Opening a private conversation…</p>
        </section>
      </main>
    );
  }

  if (deleted) {
    return (
      <main className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
        <section className={styles.shell} role="status">
          <div className={styles.deletedReceipt}>
            <p className={styles.eyebrow}>Aureus Ward</p>
            <h1>Handoff deleted</h1>
            <p>The contact request and its attributed Ward conversation have been deleted.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!profile || !conversation) {
    return (
      <main className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
        <section className={styles.shell} role="alert">
          <p className={styles.eyebrow}>Aureus Ward</p>
          <h1>Conversation unavailable</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
      <section className={styles.shell} aria-label={`${profile.name} Ward conversation`}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Aureus Ward for</p>
            <h1>{profile.name}</h1>
            <p>{profile.description}</p>
          </div>
          {primaryContact ? (
            <a
              className={styles.humanLink}
              href={contactHref(primaryContact)}
              target={primaryContact.type === 'WEBSITE' ? '_blank' : undefined}
              rel={primaryContact.type === 'WEBSITE' ? 'noreferrer' : undefined}
            >
              {contactLabel(primaryContact)}
            </a>
          ) : null}
        </header>

        <div className={styles.notice} role="note" aria-label="Ward limits">
          <strong>Business-approved answers, with sources.</strong>
          <span>{profile.notice}</span>
        </div>

        <div className={styles.timeline} aria-live="polite" aria-label="Conversation">
          {conversation.messages.map((message) => (
            <article
              key={message.id}
              className={message.role === 'VISITOR' ? styles.visitorMessage : styles.wardMessage}
              aria-label={message.role === 'VISITOR' ? 'You' : 'Ward'}
            >
              <p>{message.content}</p>
              {message.sources.length > 0 ? (
                <details className={styles.sources}>
                  <summary>
                    {message.sources.length === 1
                      ? '1 approved source'
                      : `${message.sources.length} approved sources`}
                  </summary>
                  <ul>
                    {message.sources.map((source, index) => (
                      <li key={`${source.title}-${index}`}>
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                        ) : (
                          source.title
                        )}
                        <small>Reviewed {new Date(source.reviewedAt).toLocaleDateString()}</small>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          ))}
          <div ref={endRef} />
        </div>

        {conversation.handoff ? (
          <section className={styles.handoffReceipt} aria-label="Human handoff confirmation">
            <div>
              <p className={styles.eyebrow}>Shared with your permission</p>
              <h2>A person can take it from here</h2>
              <p>{conversation.handoff.confirmation}</p>
              <small>
                Status: {conversation.handoff.status.toLowerCase()} · Scheduled for deletion by{' '}
                {new Date(conversation.handoff.retentionExpiresAt).toLocaleDateString()}
              </small>
            </div>
            <button
              type="button"
              className={styles.deleteHandoff}
              onClick={() => void deleteHandoff()}
              disabled={handoffBusy}
            >
              {handoffBusy ? 'Deleting…' : 'Delete handoff and conversation'}
            </button>
            {handoffError ? (
              <p className={styles.error} role="alert">
                {handoffError}
              </p>
            ) : null}
          </section>
        ) : handoffOpen ? (
          <form className={styles.handoffForm} onSubmit={(event) => void submitHandoff(event)}>
            <div className={styles.handoffHeading}>
              <div>
                <p className={styles.eyebrow}>Optional human follow-up</p>
                <h2>Ask {profile.name} to contact you</h2>
              </div>
              <button
                type="button"
                className={styles.closeHandoff}
                onClick={() => setHandoffOpen(false)}
              >
                Keep chatting
              </button>
            </div>

            <div className={styles.handoffFields}>
              <label>
                Your name
                <input
                  value={handoffDraft.displayName}
                  onChange={(event) =>
                    setHandoffDraft((current) => ({ ...current, displayName: event.target.value }))
                  }
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                How should they contact you?
                <select
                  value={handoffDraft.contactMethod}
                  onChange={(event) =>
                    setHandoffDraft((current) => ({
                      ...current,
                      contactMethod: event.target.value as WardLeadContactMethod,
                      contactValue: '',
                    }))
                  }
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone call</option>
                  <option value="SMS">Text message</option>
                </select>
              </label>
              <label>
                {handoffDraft.contactMethod === 'EMAIL' ? 'Email address' : 'Phone number'}
                <input
                  type={handoffDraft.contactMethod === 'EMAIL' ? 'email' : 'tel'}
                  value={handoffDraft.contactValue}
                  onChange={(event) =>
                    setHandoffDraft((current) => ({ ...current, contactValue: event.target.value }))
                  }
                  maxLength={320}
                  autoComplete={handoffDraft.contactMethod === 'EMAIL' ? 'email' : 'tel'}
                  required
                />
              </label>
              <label>
                Project location <span>(optional)</span>
                <input
                  value={handoffDraft.projectLocation}
                  onChange={(event) =>
                    setHandoffDraft((current) => ({
                      ...current,
                      projectLocation: event.target.value,
                    }))
                  }
                  maxLength={200}
                  autoComplete="address-level2"
                />
              </label>
              <label className={styles.fullField}>
                What would you like help with?
                <textarea
                  value={handoffDraft.projectSummary}
                  onChange={(event) =>
                    setHandoffDraft((current) => ({
                      ...current,
                      projectSummary: event.target.value,
                    }))
                  }
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  required
                />
              </label>
              <label className={styles.fullField}>
                Desired timing <span>(optional)</span>
                <select
                  value={handoffDraft.desiredTiming}
                  onChange={(event) =>
                    setHandoffDraft((current) => ({
                      ...current,
                      desiredTiming: event.target.value as WardLeadDesiredTiming | '',
                    }))
                  }
                >
                  <option value="">Choose only if useful</option>
                  <option value="AS_SOON_AS_POSSIBLE">As soon as possible</option>
                  <option value="WITHIN_ONE_MONTH">Within one month</option>
                  <option value="ONE_TO_THREE_MONTHS">One to three months</option>
                  <option value="THREE_TO_SIX_MONTHS">Three to six months</option>
                  <option value="EXPLORING">I am exploring</option>
                </select>
              </label>
            </div>

            <label className={styles.consent}>
              <input
                type="checkbox"
                checked={handoffDraft.consentGranted}
                onChange={(event) =>
                  setHandoffDraft((current) => ({
                    ...current,
                    consentGranted: event.target.checked,
                  }))
                }
                required
              />
              <span>{profile.handoff.consentText}</span>
            </label>
            <p className={styles.noInference}>
              Contact details are not taken from your chat. Only the fields above and this
              conversation are shared after you check the box.
            </p>
            <button
              type="submit"
              className={styles.submitHandoff}
              disabled={handoffBusy || !handoffDraft.consentGranted}
            >
              {handoffBusy ? 'Sharing…' : 'Share with the business'}
            </button>
            {handoffError ? (
              <p className={styles.error} role="alert">
                {handoffError}
              </p>
            ) : null}
          </form>
        ) : conversation.messages.some((message) => message.role === 'VISITOR') ? (
          <section className={styles.handoffOffer}>
            <div>
              <strong>Want a person at {profile.name} to follow up?</strong>
              <span>Nothing is shared unless you review the fields and consent.</span>
            </div>
            <button type="button" onClick={() => setHandoffOpen(true)}>
              Ask for human follow-up
            </button>
          </section>
        ) : null}

        <form className={styles.composer} onSubmit={(event) => void send(event)}>
          <label htmlFor={`ward-message-${slug}`}>How can we help?</label>
          <div>
            <textarea
              id={`ward-message-${slug}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1200}
              rows={embedded ? 2 : 3}
              placeholder="Ask about services, service area, policies, pricing boundaries, or how to reach a person."
              disabled={
                state === 'sending' ||
                conversation.remainingTurns <= 0 ||
                Boolean(conversation.handoff)
              }
            />
            <button
              type="submit"
              disabled={
                !draft.trim() ||
                state === 'sending' ||
                conversation.remainingTurns <= 0 ||
                Boolean(conversation.handoff)
              }
            >
              {state === 'sending' ? 'Checking…' : 'Send'}
            </button>
          </div>
          <small>
            No Aureus account is required. This private link remains in this browser tab and expires
            automatically.
          </small>
          {conversation.handoff ? (
            <p className={styles.handoffComplete} role="status">
              This conversation is now with the business team.
            </p>
          ) : null}
          {conversation.remainingTurns <= 0 ? (
            <p className={styles.error} role="status">
              This conversation has reached its limit. Please contact a person.
            </p>
          ) : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <footer className={styles.footer}>
          <span>Aureus Ward</span>
          <span>Not an emergency service · Cannot make commitments for {profile.name}</span>
        </footer>
      </section>
    </main>
  );
}
