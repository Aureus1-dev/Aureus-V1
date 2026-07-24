/**
 * Gate C (C3: Urgency assessment). Crisis-language detection is
 * deterministic — a documented, reviewable phrase list — not left to model
 * judgment, so "detection reliably triggers" is a guarantee. Checked against
 * every message in a conversation, not only the first, since a member may
 * reveal urgency at any point, not just when stating their initial need.
 *
 * The redirect copy deliberately mirrors `UrgentHelpAffordance` (Gate B —
 * B2) word for word on the specifics (911, 988, Crisis Text Line) — it must
 * never imply Aureus can dispatch emergency services, monitor a crisis in
 * real time, or do anything beyond honestly pointing to real, immediately
 * available help.
 */
const CRISIS_PHRASES = [
  'suicide', 'suicidal', 'kill myself', 'want to die', 'wanna die', 'end my life', 'ending my life',
  'no reason to live', "can't go on", 'cant go on', 'hurt myself', 'hurting myself', 'self harm', 'self-harm',
  'overdose', "i'm going to overdose", 'about to overdose',
  'kill him', 'kill her', 'kill them', 'going to hurt someone', 'going to hurt me',
  'being abused', 'going to kill me', 'in danger right now', 'not safe right now',
];

export function isCrisisLanguage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return CRISIS_PHRASES.some((phrase) => normalized.includes(phrase));
}

export const CRISIS_REDIRECT_MESSAGE = `I want to make sure you're safe right now. Aureus isn't an emergency service and can't respond to a crisis directly, but real help is available immediately: if you or someone else is in immediate danger, call 911 now. If you're thinking about suicide or self-harm, call or text 988 (the 988 Suicide & Crisis Lifeline) — available 24 hours a day, 7 days a week. You can also text HOME to 741741 to reach the Crisis Text Line. I'm still here if you want to talk about what's going on once you're safe.`;
