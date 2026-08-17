'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { provisionBusinessWorkspace } from '../../../../lib/api/business-console';
import { useSession } from '../../../../state';

export default function BusinessSetupPage() {
  const router = useRouter();
  const { session } = useSession();
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!session.accessToken) return;
    setSaving(true);
    setError('');
    try {
      await provisionBusinessWorkspace(session.accessToken, {
        name: name.trim(),
        websiteUrl: websiteUrl.trim(),
        shortDescription: description.trim(),
        fullDescription: description.trim().length >= 10 ? description.trim() : `${name.trim()} business workspace`,
      });
      router.replace('/business');
      router.refresh();
    } catch {
      setError('We could not create the private business workspace. Check the fields and try again.');
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <p>Business console</p>
      <h1>Create your private business workspace</h1>
      <p>This starts as a private draft. Nothing is published until the verification and publish gates are completed.</p>
      <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Business name
          <input required minLength={3} maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Website
          <input required type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" />
        </label>
        <label>
          Short description
          <textarea required maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={saving || !session.accessToken}>{saving ? 'Creating…' : 'Create workspace'}</button>
      </form>
    </main>
  );
}
