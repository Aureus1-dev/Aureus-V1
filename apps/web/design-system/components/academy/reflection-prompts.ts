/**
 * Reflection framing for the end of a lesson — deliberately not
 * "Knowledge Check" (Founder Decision 2). The goal is integration into
 * the member's own life, not testing recall, so headings and prompts
 * stay invitational rather than evaluative. Deterministic (keyed off the
 * lesson's position within its module) rather than random, so the same
 * lesson always reads the same way and stays testable.
 */
const HEADINGS = ['Reflect', 'Consider', 'Practice', 'Apply', 'Think About This', 'Stewardship Reflection', 'Your Next Step'] as const;

export type ReflectionHeading = (typeof HEADINGS)[number];

export interface ReflectionPrompt {
  heading: ReflectionHeading;
  body: string;
}

export function reflectionPromptFor(lessonTitle: string, position: number): ReflectionPrompt {
  const heading = HEADINGS[Math.abs(position) % HEADINGS.length];
  const body = promptBody(heading, lessonTitle);
  return { heading, body };
}

function promptBody(heading: ReflectionHeading, lessonTitle: string): string {
  switch (heading) {
    case 'Practice':
      return `Where could you put "${lessonTitle}" into practice this week?`;
    case 'Apply':
      return `What is one way this applies to a decision you're facing right now?`;
    case 'Think About This':
      return `Sit with this for a moment — what stands out to you most from "${lessonTitle}"?`;
    case 'Stewardship Reflection':
      return `How does this shape the way you steward what you've been given?`;
    case 'Your Next Step':
      return `What is one small, concrete next step this opens up for you?`;
    case 'Consider':
      return `Consider how "${lessonTitle}" connects to something you're already working toward.`;
    default:
      return `Take a moment before moving on — how might this show up in your own life?`;
  }
}
