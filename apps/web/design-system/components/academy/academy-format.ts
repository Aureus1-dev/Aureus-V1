/** Shared display formatting for Academy enum values (learning domains, statuses). */
export function formatLearningDomain(domain: string): string {
  return domain
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\bAi\b/, 'AI');
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
