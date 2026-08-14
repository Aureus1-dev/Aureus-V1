'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  resumePublicWardConversation,
  sendPublicWardMessage,
  startPublicWardConversation,
  type PublicWardContact,
  type PublicWardConversation,
  type PublicWardProfile,
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
      setError('This Ward is not available right now. You can still contact the business directly.');
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
      setConversation((current) => current ? {
        ...current,
        status: result.status,
        remainingTurns: result.remainingTurns,
        messages: [...current.messages, result.visitorMessage, result.message],
      } : current);
      setDraft('');
      setState('ready');
    } catch {
      setError('The Ward could not answer that message. Nothing was sent to the business. Please try again or contact a person.');
      setState('error');
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
                  <summary>{message.sources.length === 1 ? '1 approved source' : `${message.sources.length} approved sources`}</summary>
                  <ul>
                    {message.sources.map((source, index) => (
                      <li key={`${source.title}-${index}`}>
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                        ) : source.title}
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
              disabled={state === 'sending' || conversation.remainingTurns <= 0}
            />
            <button
              type="submit"
              disabled={!draft.trim() || state === 'sending' || conversation.remainingTurns <= 0}
            >
              {state === 'sending' ? 'Checking…' : 'Send'}
            </button>
          </div>
          <small>
            No Aureus account is required. This private link remains in this browser tab and expires automatically.
          </small>
          {conversation.remainingTurns <= 0 ? (
            <p className={styles.error} role="status">This conversation has reached its limit. Please contact a person.</p>
          ) : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </form>

        <footer className={styles.footer}>
          <span>Aureus Ward</span>
          <span>Not an emergency service · Cannot make commitments for {profile.name}</span>
        </footer>
      </section>
    </main>
  );
}
