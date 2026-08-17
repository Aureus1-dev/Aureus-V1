import type { ToolCallResponseDto } from './dto/message-response.dto';

const GREETING_PATTERNS = [
  /^(?:hi|hello|hey|hiya|howdy)[.!?]*$/i,
  /^(?:good\s+(?:morning|afternoon|evening))[.!?]*$/i,
];

const QUESTION_PREFIX = /^(?:what|when|where|who|why|how|can|could|would|will|do|does|did|is|are|am|should|may|might)\b/i;
const DATE_QUESTION = /\b(?:what|which)\s+(?:day|date)\b|\bwhat day is it\b|\btoday'?s date\b/i;
const VOICE_REQUEST = /^(?:(?:can|could|may)\s+we\s+talk|(?:can|could|may)\s+i\s+talk(?:\s+to\s+you)?|i\s+(?:want|would like)\s+to\s+talk)(?:\s+by\s+voice)?[.!?]*$/i;

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
 * A few Hall turns should be deterministic rather than depending on provider
 * scope or tool-call behavior. These are intentionally narrow: ordinary
 * conversation still goes through the AI provider.
 */
export function directHallReply(content: string, now = new Date()): string | null {
  const normalized = content.trim();
  if (GREETING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'Hello. How can we help?';
  }
  if (DATE_QUESTION.test(normalized)) {
    const today = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(now);
    return `Today is ${today}.`;
  }
  if (VOICE_REQUEST.test(normalized)) {
    return 'Yes. Tap Talk beside the message box and we can continue by voice.';
  }
  return null;
}

/**
 * Provider adapters may legitimately return tool calls with an empty text
 * payload. The Hall must never persist/render a blank assistant bubble.
 */
export function ensureVisibleAssistantContent(
  content: string | null | undefined,
  toolCalls?: readonly ToolCallResponseDto[] | null,
): string {
  const visible = content?.trim();
  if (visible) return visible;
  if (toolCalls?.length) return "I'm on it.";
  return "I couldn't finish that response. Please try asking me again.";
}

export function currentDateTimeContext(now = new Date()): string {
  return `Current server date and time (UTC): ${now.toISOString()}. If the member asks for the current day, date, or time, answer from this value. If their local timezone is not known, say that the time is UTC rather than guessing.`;
}
