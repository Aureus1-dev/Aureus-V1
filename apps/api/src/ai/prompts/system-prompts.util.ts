/**
 * Prompt templates (ADR-015 Decision 2) — plain TypeScript functions/
 * constants, not database-configurable in V1 (no product requirement asks
 * for that), kept in one module so every capability's grounding/scope
 * constraints are reviewable in one place.
 */

/**
 * Interface tool guidance (DOMAIN-007 Founder Decision 1) — the same
 * boundary language for both modalities, since text and voice now share
 * one fixed, backend-owned toolset (`ai/common/interface-tools.ts`). "One
 * AI Steward with multiple communication modalities": a member who types
 * "show me my opportunities" receives the same safe interface guidance as
 * a member who says it aloud.
 */
const INTERFACE_TOOL_GUIDANCE = `You may use the navigate_to_route, focus_interface_target, focus_form_field, open_panel, and close_panel tools to guide the member through the interface — but only when it genuinely helps them follow along, never as a reflex. Only reference a target id or panel id you have actually been told is currently visible or open; never guess or invent one. These tools only ever move the member's view, their keyboard focus, or open/close an informational panel. You have no tool to submit a form, approve or dismiss anything on the member's behalf, spend money, accept an agreement, delete information, transmit information externally, or alter permissions — you may teach, explain, recommend, navigate, and illuminate, but you never act on the member's behalf. Any action that would commit the member to something always remains theirs to take, explicitly, themselves.`;

export const PLATFORM_ASSISTANT_SYSTEM_PROMPT = `You are the Aureus platform assistant. You help members and stewards understand and use the Aureus platform — their goals, journeys, opportunities, resources, knowledge articles, Academy courses, and steward relationships.

Rules you must follow:
- Only answer questions related to the Aureus platform and the member's own platform activity. Politely decline unrelated requests (general trivia, coding help, etc.).
- You may explain, summarize, and recommend. You must never claim to have taken an action (enrolled them in a course, saved an opportunity, changed a setting, etc.) beyond navigating or highlighting the interface — the member always acts for themselves through the platform's own features.
- If you are not confident in an answer, say so rather than inventing platform details.
- Keep answers concise and practical.

${INTERFACE_TOOL_GUIDANCE}`;

/**
 * Voice Domain system prompt (AFX-003 Voice & Presence Canon). Same scope
 * boundary as PLATFORM_ASSISTANT_SYSTEM_PROMPT — voice grants no broader
 * tool or action permission than text (Founder Decision 5, DOMAIN-005) —
 * with explicit conversational-presence instructions matching AFX-003
 * §2-5, §9: listen fully before responding, tolerate pauses, never rush.
 */
export const VOICE_ASSISTANT_SYSTEM_PROMPT = `${PLATFORM_ASSISTANT_SYSTEM_PROMPT}

You are speaking with the member live, by voice. Additional rules for live conversation:
- Listen fully before responding. Do not prepare your reply before the member has finished a thought.
- A brief pause does not mean the member is finished. Do not rush to fill silence.
- Speak calmly, warmly, and at a natural, unhurried pace — never as though competing for attention.
- If you are uncertain whether the member has finished speaking, it is better to wait or gently check than to interrupt.`;

export function buildOpportunityExplanationPrompt(opportunity: {
  title: string; shortDescription: string; fullDescription: string; benefitType: string; eligibilityRules: string;
}): string {
  return `Explain the following Opportunity to a member in plain, encouraging language. Summarize what it offers, who is eligible, and one practical next step. Keep it under 150 words.

Title: ${opportunity.title}
Benefit type: ${opportunity.benefitType}
Short description: ${opportunity.shortDescription}
Full description: ${opportunity.fullDescription}
Eligibility rules: ${opportunity.eligibilityRules}`;
}

export function buildResourceExplanationPrompt(resource: {
  title: string; shortDescription: string; fullDescription: string; resourceType: string;
}): string {
  return `Explain the following Resource to a member in plain, encouraging language. Summarize what it offers and one practical next step. Keep it under 150 words.

Title: ${resource.title}
Resource type: ${resource.resourceType}
Short description: ${resource.shortDescription}
Full description: ${resource.fullDescription}`;
}

export function buildJourneyGuidancePrompt(context: {
  goalTitle: string; journeyStatus: string;
  milestones: { title: string; status: string }[];
}): string {
  const milestoneLines = context.milestones.length
    ? context.milestones.map((m) => `- ${m.title} (${m.status})`).join('\n')
    : '(no milestones yet)';

  return `A member is working toward this goal via their Journey. Offer brief, encouraging, practical guidance on what to focus on next. Keep it under 150 words.

Goal: ${context.goalTitle}
Journey status: ${context.journeyStatus}
Milestones:
${milestoneLines}`;
}

export function buildAcademyGuidancePrompt(context: {
  courseTitle: string; courseShortDescription: string; learningDomain: string;
  memberGoalTitles: string[];
}): string {
  const goalLines = context.memberGoalTitles.length
    ? context.memberGoalTitles.map((t) => `- ${t}`).join('\n')
    : '(the member has not set any goals yet)';

  return `Explain how the following Academy course could help a member, considering their stated goals. Keep it under 150 words.

Course: ${context.courseTitle}
Learning domain: ${context.learningDomain}
Course description: ${context.courseShortDescription}
Member's goals:
${goalLines}`;
}

export function buildKnowledgeSearchPrompt(query: string, articles: { title: string; summary: string }[]): string {
  const articleLines = articles.length
    ? articles.map((a, i) => `${i + 1}. ${a.title} — ${a.summary}`).join('\n')
    : '(no matching articles were found)';

  return `A member searched the Knowledge System for: "${query}"

Here are the top matching verified articles:
${articleLines}

Write a short (under 150 words) synthesized answer to their question, referencing the article titles above. If no articles are relevant, say so honestly and suggest they rephrase their search.`;
}

/**
 * Institutional Wisdom (WO-030 §7.2, Founder Decision #6). Input is
 * strictly the Pod-level aggregate metrics already defined in §1.10 —
 * never message content, individual RSVP/attendance records, or
 * faithPreference. "AI assists Stewards in understanding communities. It
 * does not judge the people entrusted to their care."
 */
export function buildPodStewardInsightPrompt(metrics: {
  activeMemberCount: number;
  attendanceRatePercent: number | null;
  serviceProjectCount: number;
  serviceProjectsCompleted: number;
  eventsHeldLast90Days: number;
}): string {
  return `A Pod Steward has requested AI-generated insight about their own Pod, using only aggregate, non-identifying data they are already authorized to see. Offer explainable, actionable observations that help the Steward strengthen stewardship, Human Flourishing, and community health. Never generate a score, rating, or judgment about any individual member — you have not been given any individual-level data, and must not invent any. Keep it under 150 words.

Pod aggregate metrics:
- Active members: ${metrics.activeMemberCount}
- Meeting attendance rate: ${metrics.attendanceRatePercent === null ? 'not enough data yet' : `${metrics.attendanceRatePercent}%`}
- Service projects: ${metrics.serviceProjectCount} total, ${metrics.serviceProjectsCompleted} completed
- Meetings held in the last 90 days: ${metrics.eventsHeldLast90Days}`;
}

export function buildPodInstitutionalWisdomPrompt(
  pods: { activeMemberCount: number; attendanceRatePercent: number | null; serviceProjectCount: number; eventsHeldLast90Days: number }[],
): string {
  const lines = pods.map((p, i) => `${i + 1}. members=${p.activeMemberCount}, attendance=${p.attendanceRatePercent ?? 'n/a'}%, serviceProjects=${p.serviceProjectCount}, meetingsLast90d=${p.eventsHeldLast90Days}`).join('\n');

  return `Aureus is generating aggregate Institutional Wisdom (Article X) from anonymized, Pod-level metrics across ${pods.length} Pods. Identify honest patterns in what strengthens Human Flourishing and community health (e.g. cadence vs. attendance, service activity vs. stability). Never reference or imply which specific Pod any observation came from — every sentence must describe a pattern across the group, not any single Pod's identity. Keep it under 200 words.

Aggregate Pod metrics (one row per Pod, no names or identifiers):
${lines}`;
}

export function buildRecommendationRationalePrompt(context: {
  category: string;
  memberGoalTitles: string[];
  candidates: { id: string; title: string; description: string }[];
}): string {
  const goalLines = context.memberGoalTitles.length
    ? context.memberGoalTitles.map((t) => `- ${t}`).join('\n')
    : '(the member has not set any goals yet)';
  const candidateLines = context.candidates.map((c) => `- [${c.id}] ${c.title}: ${c.description}`).join('\n');

  return `A member is looking for ${context.category} recommendations. Given their goals below, choose up to 3 of the best-fitting candidates from the list and, for each, write one short (1-2 sentence) rationale explaining why it fits.

Respond ONLY as JSON: an array of objects with "id" (the bracketed id from the candidate list) and "rationale" (string). Do not include any other text.

Member's goals:
${goalLines}

Candidates:
${candidateLines}`;
}
