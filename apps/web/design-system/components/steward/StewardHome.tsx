'use client';

import { useSession, useConversation, useHighlightRegistry } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { MessageComposer } from '../conversation/MessageComposer';
import { RecentConversationPreview } from './RecentConversationPreview';
import { NeedsYourDecision } from './NeedsYourDecision';
import styles from './StewardHome.module.css';

/**
 * The full-page Steward surface (FPB-002 §3 "Steward," one of the 20
 * primary surfaces — every surface "shall support both conversational
 * entry and direct navigation"). The same building blocks as the
 * floating `StewardWorkspace` — nothing here duplicates state, only
 * presentation, so a member arriving here directly sees exactly what the
 * workspace panel would have shown.
 */
export function StewardHome() {
  const { session } = useSession();
  const conversation = useConversation();
  const { describeTargets } = useHighlightRegistry();

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to reach your Steward"
        description="Sign in to talk with your Steward, review pending decisions, and pick up where you left off."
      />
    );
  }

  function handleSubmit() {
    const interfaceContext = describeTargets()
      .map((t) => `${t.id} (${t.label})`)
      .join(', ');
    void conversation.sendMessage(interfaceContext || undefined);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Steward</h1>
      <p className={styles.intro}>
        Ask anything, review what&apos;s waiting for your decision, or pick up a conversation right where you left it.
      </p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Talk with your Steward</h2>
        <RecentConversationPreview />
        <MessageComposer
          value={conversation.state.draft}
          onChange={conversation.setDraft}
          onSubmit={handleSubmit}
          disabled={conversation.state.pendingResponse}
        />
        <p className={styles.hint}>Tip: press ⌘K (or Ctrl+K) anywhere to open the command palette.</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Needs your decision</h2>
        <NeedsYourDecision />
      </div>
    </div>
  );
}
