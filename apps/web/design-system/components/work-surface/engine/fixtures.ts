import type { MatterScript, ResultArtifact, StewardshipStory } from './types';

/**
 * PROTOTYPE FIXTURE DATA. Every story, matter script, and artifact below
 * is scripted for Slice 0 review — none of it comes from a real steward,
 * a real orchestration run, or a real member. Text is drawn directly from
 * the worked examples in `AUREUS-WORK-SURFACE-PORTFOLIO.md` §4 and
 * `AUREUS-WORK-SURFACE-REVIEW-ADDENDUM.md` §3.2 so the reviewed prototype
 * matches the approved design language exactly, not an approximation of it.
 */

export const STEWARDSHIP_STORIES: StewardshipStory[] = [
  {
    id: 'story-housing',
    title: 'Needed to move within three weeks',
    situation: 'Needed to move within three weeks.',
    carried: [
      'Organized the housing search',
      'Checked assistance options',
      'Prepared documents and calls',
      'Tracked deadlines and the moving plan',
    ],
    result: 'Application submitted, assistance secured, move completed.',
    category: 'family',
  },
  {
    id: 'story-utility',
    title: 'Fell behind on utilities after losing hours at work',
    situation: 'Fell behind on utilities after losing hours at work.',
    carried: [
      'Found eligible assistance programs',
      'Prepared the application packet',
      'Tracked deadlines',
      'Kept the household plan together',
    ],
    result: 'Shutoff avoided and arrears reduced.',
    category: 'people',
  },
  {
    id: 'story-business',
    title: 'Small business was losing leads after hours',
    situation: 'Small business was losing leads after hours.',
    carried: [
      'Captured inquiries as they came in',
      'Qualified the work',
      'Prepared the next step',
      'Kept the owner from waking up to missed opportunities',
    ],
    result: 'Fewer lost leads and faster follow-up.',
    category: 'business',
  },
];

const utilityArtifact: ResultArtifact = {
  id: 'artifact-utility-eligibility',
  name: 'Utility assistance eligibility summary',
  status: 'Ready for your review',
  currentness: 'Checked moments ago',
  relatedMatter: 'Avoid a utility shutoff',
  evidence: ['3 programs checked against county rules', 'Deadlines confirmed for all 3'],
  whatRemains:
    'Review and sign the application — Aureus prepared it, submitting needs your identity.',
  doneMeans: 'Application submitted and a confirmation number received.',
};

const housingArtifact: ResultArtifact = {
  id: 'artifact-housing-comparison',
  name: 'Housing comparison',
  status: 'Waiting on you',
  currentness: 'Updated moments ago',
  relatedMatter: 'Move before October 1',
  evidence: [
    '3 viable units compared against your budget',
    '2 assistance paths checked',
    '1 deadline tomorrow',
  ],
  whatRemains: 'Confirm whether Upper Darby is acceptable so Aureus can continue the application.',
  doneMeans: 'Lease signed or the move plan otherwise resolved before your deadline.',
};

const generalArtifact: ResultArtifact = {
  id: 'artifact-research-brief',
  name: 'Research brief',
  status: 'Ready for your review',
  currentness: 'Checked moments ago',
  relatedMatter: 'Your request',
  evidence: ['Sources checked and cross-referenced'],
  whatRemains: null,
  doneMeans: 'You have what you need to decide the next step.',
};

/** Utility-assistance script — wording matches the addendum's §3.2 example verbatim. */
export const UTILITY_MATTER: MatterScript = {
  id: 'matter-utility',
  workingOn: 'Avoid a utility shutoff and get caught up',
  steps: [
    { id: 'step-1', label: 'Checking eligibility for utility assistance…', holdMs: 1400 },
    { id: 'step-2', label: 'Found 3 programs. Checking deadlines…', holdMs: 1400 },
    { id: 'step-3', label: 'Preparing the application package…', holdMs: 1400 },
    { id: 'step-4', label: 'Application package ready for your review.', holdMs: 900 },
  ],
  carrying: [
    { id: 'carry-1', label: 'Eligibility check', status: 'completed' },
    { id: 'carry-2', label: 'Program comparison', status: 'completed' },
    { id: 'carry-3', label: 'Application package', status: 'working' },
  ],
  needsYouAt: 3,
  needsYou: {
    id: 'needs-utility-signature',
    prompt: 'Review and sign the utility assistance application before it can be submitted.',
    actionLabel: 'Review application',
  },
  foundAt: 1,
  found: [{ id: 'found-1', label: '3 matching programs found' }],
  artifactAt: 3,
  artifact: utilityArtifact,
  doneMeans: 'Application submitted and a confirmation number received.',
};

/** Housing script — wording matches the portfolio's §6 State C example verbatim. */
export const HOUSING_MATTER: MatterScript = {
  id: 'matter-housing',
  workingOn: 'Move before October 1',
  steps: [
    { id: 'step-1', label: 'Comparing 6 housing options against your budget…', holdMs: 1400 },
    { id: 'step-2', label: 'Checking 2 moving-assistance paths…', holdMs: 1400 },
    { id: 'step-3', label: 'Drafting the move plan…', holdMs: 1400 },
    { id: 'step-4', label: 'Move plan drafted. Waiting on your confirmation.', holdMs: 900 },
  ],
  carrying: [
    { id: 'carry-1', label: 'Housing search', status: 'completed' },
    {
      id: 'carry-2',
      label: 'Moving assistance',
      status: 'completed',
      detail: '2 programs checked',
    },
    { id: 'carry-3', label: 'Documents', status: 'working', detail: '3 of 5 ready' },
    { id: 'carry-4', label: 'Move plan', status: 'working' },
  ],
  needsYouAt: 3,
  needsYou: {
    id: 'needs-housing-upper-darby',
    prompt: 'Confirm whether Upper Darby is acceptable.',
    actionLabel: 'Review',
  },
  foundAt: 1,
  found: [{ id: 'found-1', label: '3 viable units · 2 assistance paths · 1 deadline tomorrow' }],
  artifactAt: 3,
  artifact: housingArtifact,
  doneMeans: 'Lease signed or the move plan otherwise resolved before your deadline.',
};

/** Fallback script for any request that does not match a keyed matter above. */
export const GENERAL_MATTER: MatterScript = {
  id: 'matter-general',
  workingOn: 'Your request',
  steps: [
    { id: 'step-1', label: 'Reading what you shared…', holdMs: 1100 },
    { id: 'step-2', label: 'Checking relevant sources…', holdMs: 1400 },
    { id: 'step-3', label: 'Putting together what you need…', holdMs: 1400 },
    { id: 'step-4', label: 'Ready for your review.', holdMs: 900 },
  ],
  carrying: [
    { id: 'carry-1', label: 'Research', status: 'completed' },
    { id: 'carry-2', label: 'Summary', status: 'working' },
  ],
  needsYouAt: -1,
  needsYou: null,
  foundAt: 1,
  found: [{ id: 'found-1', label: 'Relevant sources checked' }],
  artifactAt: 3,
  artifact: generalArtifact,
  doneMeans: 'You have what you need to decide the next step.',
};

const movePlanArtifact: ResultArtifact = {
  id: 'artifact-move-plan',
  name: 'Moving plan',
  status: 'Done',
  currentness: 'Completed last week',
  relatedMatter: 'Move before October 1',
  evidence: ['Lease signed', 'Movers confirmed for September 28', 'Utilities transferred'],
  whatRemains: null,
  doneMeans: 'Move completed and confirmed by you.',
};

/** A fully completed matter — used for the returning-member "Found / Completed" fixture card. */
export const MOVE_PLAN_MATTER: MatterScript = {
  id: 'matter-move-plan',
  workingOn: 'Plan the move to the new apartment',
  steps: [{ id: 'step-1', label: 'Move completed and confirmed.', holdMs: 0 }],
  carrying: [
    { id: 'carry-1', label: 'Movers', status: 'completed' },
    { id: 'carry-2', label: 'Utilities transfer', status: 'completed' },
  ],
  needsYouAt: -1,
  needsYou: null,
  foundAt: 0,
  found: [{ id: 'found-1', label: 'Move completed on schedule' }],
  artifactAt: 0,
  artifact: movePlanArtifact,
  doneMeans: 'Move completed and confirmed by you.',
};

export function matterScriptForMessage(text: string): MatterScript {
  const lower = text.toLowerCase();
  if (/(utility|utilities|electric|shutoff|shut off|power bill)/.test(lower)) return UTILITY_MATTER;
  if (/(housing|apartment|move|moving|rent|lease|eviction)/.test(lower)) return HOUSING_MATTER;
  return GENERAL_MATTER;
}

export const RETURNING_HOUSING_MATTER: MatterScript = {
  ...HOUSING_MATTER,
  steps: HOUSING_MATTER.steps.slice(-1),
};
