import { ConversationSurface } from '../../../design-system/components/conversation';

export default async function ConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <ConversationSurface initialMode={mode === 'voice' ? 'voice' : 'text'} />;
}
