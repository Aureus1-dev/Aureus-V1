import { CitySheetEntry } from '@prisma/client';

export interface ChecklistItemForScript {
  id: string;
  label: string;
}

/**
 * Builds a fillable phone-call script for verifying one City Sheet entry
 * (A4-PREP). Every fact inserted here comes directly from the entry's own
 * stored fields — this never invents anything new about the organization,
 * it only restates what is already on file and prompts the steward to
 * confirm or correct it during the call.
 */
export function buildCallScript(entry: CitySheetEntry, checklist: ChecklistItemForScript[]): string {
  const onFile = [
    `Organization: ${entry.organizationName}`,
    `Category: ${entry.category}`,
    `Phone on file: ${entry.phone ?? 'none on file'}`,
    `Address on file: ${entry.address ?? 'none on file'}`,
    `Hours on file: ${entry.hours}`,
    `Service area on file: ${entry.serviceArea}`,
  ].join('\n');

  const checklistLines = checklist.map((item) => `  [ ] ${item.label}`).join('\n');

  return [
    `Call script — verifying ${entry.organizationName} (${entry.citySheetRef ?? entry.id})`,
    '',
    'What we currently have on file (confirm or correct each item during the call):',
    onFile,
    '',
    'Opening:',
    `"Hi, this is [your name] calling on behalf of Aureus, a community support service in Chester and Delaware County, PA. I'm calling to confirm some information we have on file about ${entry.organizationName} so we can refer people to you accurately. Do you have a few minutes?"`,
    '',
    'Confirm the following:',
    checklistLines,
    '',
    'Closing:',
    '"Thank you so much for your time — this really helps us make sure the people we refer to you get accurate, up-to-date information."',
    '',
    'After the call, record the outcome:',
    `- If everything checks out: POST /city-sheet/${entry.id}/verify with your confidence level (HIGH/MEDIUM/LOW), your notes, and the checklist responses above.`,
    `- If something is wrong but might be fixable later: POST /city-sheet/${entry.id}/flag-for-review (only valid if already VERIFIED) or leave as-is and note the issue.`,
    `- If this organization can't be verified, no longer offers this service, or is otherwise wrong: POST /city-sheet/${entry.id}/reject with a reason and your confidence level.`,
    'Only a Human Steward or the Founder may submit any of these — this script does not do it for you.',
  ].join('\n');
}
