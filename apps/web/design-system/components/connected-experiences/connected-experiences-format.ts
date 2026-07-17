/** Shared display formatting for Connected Experiences enum values and content. */
export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\bAi\b/, 'AI');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatActivityEventType(eventType: string): string {
  switch (eventType) {
    case 'CONNECTION_REQUESTED':
      return 'Connection requested';
    case 'CONNECTION_ESTABLISHED':
      return 'Connected';
    case 'CONNECTION_REVOKED':
      return 'Revoked';
    case 'DOCUMENT_UPLOADED':
      return 'Document uploaded';
    case 'DOCUMENT_SUMMARIZED':
      return 'Document summarized';
    case 'DOCUMENT_DELETED':
      return 'Document deleted';
    default:
      return formatEnumLabel(eventType);
  }
}

export function formatActor(actor: string): string {
  switch (actor) {
    case 'MEMBER':
      return 'You';
    case 'AI_STEWARD':
      return 'Your AI Steward';
    case 'SYSTEM':
      return 'Aureus';
    default:
      return formatEnumLabel(actor);
  }
}
