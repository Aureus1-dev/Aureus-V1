import { getSharedMessage } from '@aureus-v1/shared';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Aureus V1</h1>
      <p>{getSharedMessage()}</p>
      <p>Modern TypeScript monorepo foundation is live.</p>
    </main>
  );
}
