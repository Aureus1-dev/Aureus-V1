# A4 Verification Guide — For Human Stewards

This is the runbook for completing **A4 — Human-verify every referral** (`docs/launch/WORKORDERS.md`). It walks through the tooling built in **A4-PREP** so verification calls are fast and consistent. It does not make any decision for you — every approve/reject/flag call in this workflow requires a real Steward or Founder account, and nothing here can act on its own.

## Before you start

- **A3** compiled an initial candidate list via web research — not from phone calls. Every candidate's `sourceNotes` field records exactly where its information came from, and it is never touched by anything in this guide. Treat every candidate as unconfirmed until you personally complete the steps below.
- One candidate, **Media Food Bank**, is flagged in its own `sourceNotes` as lower-confidence (sourced from a third-party directory, not the organization's own site). Confirm its identity carefully before relying on it.

## Step 1 — Pull your queue

```
GET /city-sheet?verificationStatus=UNVERIFIED
```

This is the full list of candidates waiting on you. Add `&verificationStatus=NEEDS_REVIEW` to also see previously-verified entries that have been flagged for a re-check. Prioritize `CRISIS_LINE` entries first — they matter most for Gate B.

## Step 2 — Get the call guide for one entry

```
GET /city-sheet/:id/verification-guide
```

Returns, for that one candidate:
- **Current facts on file** (organization name, category, phone, address, hours, service area) — exactly what's stored, nothing invented.
- **The applicable checklist** — every common item plus everything specific to that candidate's category. The checklist is configuration-driven (`CitySheetChecklistItem`), not hardcoded, so what you see here can change over time as Operations refines it — you don't need a new deploy to get an updated list.
- **A ready-to-read call script** built from the two things above, with an opening line, every checklist item as a line to confirm, a closing line, and a reminder of what to do next.

Make the call. Confirm or correct each checklist item.

## Step 3 — Record the outcome

Exactly one of the following, always including your **confidence** (`HIGH` / `MEDIUM` / `LOW`) — this is recorded for context and never changes whether the action succeeds, so answer it honestly even when you're not fully sure:

**Everything checks out — approve it:**
```
POST /city-sheet/:id/verify
{
  "confidence": "HIGH",
  "verificationNotes": "Called 610-280-3270, confirmed 24/7 operation and current hours.",
  "checklistResponses": [
    { "itemId": "...", "label": "Phone number reached and currently in service", "confirmed": true }
  ]
}
```
Valid from `UNVERIFIED` or `NEEDS_REVIEW` (also from `REJECTED`, if you're correcting an earlier mistaken rejection). Records your steward ID and the timestamp — that's what satisfies A4's "100% of entries carry a human verification timestamp and verifier name" requirement.

**Something's wrong — reject it:**
```
POST /city-sheet/:id/reject
{
  "reason": "Phone number is disconnected; no successor organization found.",
  "confidence": "HIGH"
}
```
This also marks the entry `INACTIVE` so it stops looking usable. If you later find out you were wrong, `verify()` can reopen it — there's no separate "undo."

**A previously-verified entry now looks stale — flag it (does not itself decide anything):**
```
POST /city-sheet/:id/flag-for-review
{ "reason": "Phone number no longer connects.", "confidence": "MEDIUM" }
```
Only valid on entries currently `VERIFIED`. Moves them to `NEEDS_REVIEW` so someone (possibly you) revisits with `verify()` or `reject()`.

## Nothing is ever lost

Every one of those three actions appends a permanent row to that entry's history — nobody's call is ever overwritten or silently replaced, even by a later call on the same entry:

```
GET /city-sheet/:id/verification-history
```

Returns every event in order: who did what, when, at what confidence, with what notes, and exactly which checklist items were confirmed. This is the audit trail Gate A5's QA spot-check and any future review will use.

## Governance — what this workflow does and doesn't do

- This guide, the checklist, and the call script are **assistive tooling only**. They never call `verify`/`reject`/`flag-for-review` themselves.
- Every one of those three endpoints requires a real, JWT-authenticated `STEWARD` or `PLATFORM_ADMINISTRATOR` (Founder) session. The automated actor that compiled A3's candidates (`city-sheet-research@ai.aureus.internal`, role `AI_SERVICE_ACCOUNT`) has **no access** to any of these routes and cannot verify or reject anything — it has no password and could not log in even if it tried.
- Nothing in this workflow can mark an entry `VERIFIED` on its own. If a step in this document ever appears to do that, stop and report it — that would be a governance violation, not a feature.

## Evolving the checklist (Operations only)

The checklist itself lives in the database, not in code, specifically so it can improve without an engineering deploy:

```
GET   /city-sheet/checklist-items                 — list current items
POST  /city-sheet/checklist-items                  — add a new item (category optional; omit for "applies to every category")
PATCH /city-sheet/checklist-items/:id               — edit a label/order, or retire one via isActive: false
```

These three routes require `PLATFORM_ADMINISTRATOR` (Operations/Founder) — a front-line Steward completing calls does not need or get access to change the checklist itself, only to use it.
