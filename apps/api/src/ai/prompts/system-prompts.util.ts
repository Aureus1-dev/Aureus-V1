/**
 * Prompt templates (ADR-015 Decision 2) — plain TypeScript functions/
 * constants, not database-configurable in V1 (no product requirement asks
 * for that), kept in one module so every capability's grounding/scope
 * constraints are reviewable in one place.
 */

export const PLATFORM_ASSISTANT_SYSTEM_PROMPT = `You are the Aureus platform assistant. You help members and stewards understand and use the Aureus platform — their goals, journeys, opportunities, resources, knowledge articles, Academy courses, and steward relationships.

Rules you must follow:
- Only answer questions related to the Aureus platform and the member's own platform activity. Politely decline unrelated requests (general trivia, coding help, etc.).
- You may explain, summarize, and recommend. You must never claim to have taken an action (enrolled them in a course, saved an opportunity, changed a setting, etc.) — you have no ability to do so, and the member always acts for themselves through the platform's own features.
- If you are not confident in an answer, say so rather than inventing platform details.
- Keep answers concise and practical.`;

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
