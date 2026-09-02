# OR-002 — People Help-to-Completion

**Status:** Implementation candidate  
**Repository:** Aureus-V1  
**Base:** `29e402941cece696040dbbf6ae675b308a8291db`  
**Branch:** `feat/or-002-people-help-completion`  
**Architecture:** PA-021 + PA-022  
**Responsibility Core:** OR-001  
**Cross-context gate:** OR-CCT-001

## 1. Objective

Prove that a member can ask Aureus to carry one real piece of People-side work beyond a single chat turn, leave, return, resume, receive bounded guidance, and see truthful progress/outcome state.

OR-002 must make the first Responsibility feel like stewardship rather than a backend record, while preserving OR-001's strict PERSONAL / GUIDANCE_ONLY / PERSONAL_PRIVATE boundary.

## 2. First proof

Reuse the existing See → Guide application system.

`verified opportunity → member chooses “help me with this application” → durable Responsibility → verified application destination → member-authorized screen guidance → member leaves/returns → work resumes → member records outcome → Responsibility reconciles → progress remains visible`

The first new Responsibility kind is:

- `OPPORTUNITY_APPLICATION_GUIDANCE`

The bounded objective is:

> Help me work through the verified application for this Opportunity.

This is **guidance**, not autonomous application submission.

## 3. Truthful completion

Aureus may observe and verify its own application-guidance activity, but it does not independently observe what a third-party application ultimately accepted.

Therefore:

- GuidedApplicationSession activity is server-observed system evidence.
- SavedOpportunity.trackingStatus remains member-managed / REPORTED evidence.
- `APPLIED` means “the member reports they submitted/applied.”
- `NOT_INTERESTED` means “the member reports they decided not to continue.”
- Neither state may be described as external approval, award, benefit receipt, or acceptance by the third party.

The Responsibility may complete when its **bounded assistance outcome** is satisfied by an explicit member-recorded terminal application decision. The UI must show the evidence truthfully as member-reported.

## 4. Member flow

### Start / resume

A member explicitly chooses application help from a verified Opportunity action.

Server must:

1. authenticate the member;
2. verify the Hall conversation belongs to them;
3. verify Opportunity is ACTIVE + VERIFIED + undeleted + unexpired;
4. verify the canonical application destination is currently verified and HTTPS;
5. create or reuse one open PERSONAL / GUIDANCE_ONLY / PERSONAL_PRIVATE `OPPORTUNITY_APPLICATION_GUIDANCE` Responsibility;
6. start or resume the existing GuidedApplicationSession;
7. if the Responsibility was WAITING_ON_USER, move it back to ACTIVE with an append-only STATE_CHANGED event;
8. return both the Responsibility and guide session.

No Business/shared context is created or transferred.

### Leave / return

A browser close or ordinary navigation does not destroy the Responsibility.

An active GuidedApplicationSession remains discoverable by conversation and the Responsibility remains ACTIVE.

If the member explicitly chooses “pause for now”:

- end/revoke the current guide session;
- move ACTIVE Responsibility → WAITING_ON_USER;
- append USER_INPUT_REQUIRED exactly once for that waiting state.

Starting application help again for the same member/opportunity reuses the same open Responsibility and returns it to ACTIVE.

### Record outcome

The member may explicitly record:

- APPLIED;
- NOT_INTERESTED.

The server reuses SavedOpportunity:

- create it if absent;
- update its trackingStatus to the explicit member choice;
- end the active guide session;
- complete the open application-guidance Responsibility using reference-only REPORTED evidence from SavedOpportunity.

A model cannot set this outcome and page/screenshot content cannot set this outcome.

## 5. Private progress surface

The Conversation Surface should show a compact, human-readable Steward progress state whenever OR-002 application help is active.

Required language:

- “Aureus is carrying this with you.”
- objective/opportunity name;
- status translated into ordinary language;
- “Private to your Aureus account”;
- explicit authority boundary: Aureus guides; the member submits/attests;
- if completed from SavedOpportunity, show “Application status: reported by you” rather than “verified/approved.”

Do not build a social feed, life profile, streak, engagement score, or milestone-history system in OR-002.

## 6. Server boundaries

OR-002 remains:

- context: PERSONAL;
- authority: GUIDANCE_ONLY;
- privacy: PERSONAL_PRIVATE.

Caller may not provide:

- Principal;
- context type;
- authority class;
- privacy scope;
- policy version;
- evidence level;
- completion status.

All routes are self-scoped from JWT.

OR-CCT-001 remains unimplemented.

## 7. Reuse

Reuse:

- Responsibility / ResponsibilityEvent from OR-001;
- ConversationsService ownership check;
- OpportunitiesService and OpportunityLinkRegistryService;
- GuidedApplicationService / GuidedApplicationSession;
- SavedOpportunitiesService;
- ConversationSurface;
- ApplicationGuidePanel.

Do not create:

- a second application session model;
- a second opportunity-status table;
- a People CRM;
- a personal profile/memory model;
- a generic workflow engine.

## 8. Deny paths

Tests must prove:

1. unauthenticated start/pause/complete denied;
2. another member conversation cannot seed application help;
3. another member cannot read/mutate the Responsibility or guide session;
4. caller-supplied context/authority/privacy/evidence fields rejected;
5. inactive/unverified/deleted/expired Opportunity cannot seed help;
6. unverified/non-HTTPS application destination cannot seed help;
7. duplicate start reuses the same open Responsibility;
8. pause is idempotent and does not duplicate USER_INPUT_REQUIRED;
9. resume moves WAITING_ON_USER → ACTIVE once;
10. screen analysis still requires explicit unexpired consent;
11. model/screenshot analysis cannot complete the Responsibility;
12. APPLIED / NOT_INTERESTED outcome must come from explicit authenticated member action;
13. completion evidence is REPORTED, never silently VERIFIED;
14. completion is idempotent;
15. completed Responsibility is not silently reopened by an ordinary page load;
16. Business/shared Responsibility rows remain invisible;
17. no cross-context transition occurs;
18. screenshot bytes and extracted field values remain unpersisted as before.

## 9. Explicit non-goals

- no browser clicks, typing, autofill, or submit;
- no autonomous legal/financial attestation;
- no external approval verification integration;
- no Business/shared Responsibility;
- no Completion Case transfer;
- no life-memory timeline;
- no generic evidence upload;
- no new AI-provider authority;
- no Opportunity outcome claim stronger than the evidence supports.

## 10. Done

OR-002 is ready for independent review only when:

- schema/migration changes apply cleanly;
- OR-001 tests remain green;
- new unit/integration/e2e tests prove start/pause/resume/complete and deny paths;
- web tests prove the private progress language and evidence labels;
- full CI and Docker verification pass on one exact head;
- exact SHA is frozen;
- Claude independently reviews that exact SHA;
- Founder separately decides merge.

