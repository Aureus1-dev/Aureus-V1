import type { ToolCallDto } from './dto/message-response.dto';

const GREETING_PATTERNS = [
  /^(?:hi|hello|hey|hiya|howdy)[.!?]*$/i,
  /^(?:good\s+(?:morning|afternoon|evening))[.!?]*$/i,
];

const QUESTION_PREFIX = /^(?:what|when|where|who|why|how|can|could|would|will|do|does|did|is|are|am|should|may|might)\b/i;

/**
 * The Hall is a conversation surface, not a mandatory intake form. A greeting
 * or ordinary direct question must be allowed to reach the Steward instead of
 * being misclassified as an ambiguous stated need.
 */
export function isConversationalTurnWithoutNeed(content: string): boolean {
  const normalized = content.trim();
  if (!normalized) return false;
  return GREETING_PATTERNS.some((pattern) => pattern.test(normalized)) || QUESTION_PREFIX.test(normalized);
}

/**
 * Provider adapters may legitimately return tool calls with an empty text
 * payload. The Hall must never persist/render a blank assistant bubble.
 */
export function ensureVisibleAssistantContent(
  content: string | null | undefined,
  toolCalls?: readonly ToolCallDto[] | null,
): string {
  const visible = content?.trim();
  if (visible) return visible;
  if (toolCalls?.length) return "I'm on it.";
  return "I couldn't finish that response. Please try asking me again.";
}

export function currentDateTimeContext(now = new Date()): string {
  return `Current server date and time (UTC): ${now.toISOString()}. If the member asks for the current day, date, or time, answer from this value. If their local timezone is not known, say that the time is UTC rather than guessing.`;
}
