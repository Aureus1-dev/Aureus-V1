# AUREUS-STEWARD-VOICE-INTERFACE-001

**Status:** Active documentation work order  
**Track:** Member Experience / Steward  
**Repository:** `Aureus1-dev/Aureus-V1`  
**Base:** `main` at `252b904f010ad86d907112beb01112e3ec661788`  
**Branch:** `docs/steward-voice-interface-standard`  
**Constructor:** ChatGPT  
**Reviewer:** Independent thread/session; may not edit this branch while acting as reviewer

## 1. Founder direction

Capture the Founder-authored **Aureus Steward — Voice & Interface** doctrine as a load-bearing Member Experience standard governing how the Steward sounds, how the interface behaves, and how voice and visual remain one story.

The governing product thesis for this slice is:

> **The interface is the Steward's body.**

The screen must express what Aureus is carrying, holding, asking, waiting on, recovering, or finishing. The member should not experience software containers for their own sake.

## 2. Why this work order exists

The current Member Experience canon already contains Steward, Arrival, Motion & Navigation, Journey, and Ceremonies documents. The Founder-authored doctrine materially sharpens and in some places conflicts with older experience language.

Known conflict examples that must be reconciled rather than silently layered:

- `AUREA-002 — ARRIVAL CANON` currently prescribes an opening sequence of darkness, light, Aureus mark, branding statements, Hall reveal, and then Steward welcome. The new doctrine calls for an almost empty opening surface: name pronunciation, one microphone, and no logo wall, tour, progress bar, or account setup.
- `AUREA-002 — ARRIVAL CANON` currently declares the first meaningful interaction to be `How can we help?`. The new doctrine makes name pronunciation the opening beat and `What's going on?` the second question.
- `AUREUS-004 — THE STEWARD CANON` defines the Steward's relationship-level identity and trust principles. The new doctrine does not replace those higher-level purposes; it operationalizes voice, interface, carrying, waiting, recovery, access, sharing, and completion.

This work order must make the relationship between old and new canon explicit.

## 3. Scope

This slice is documentation-only.

It MAY:

- add the new Steward Voice & Interface canon;
- define explicit precedence/supersession for conflicting Member Experience clauses;
- record the exact implementation invariants future code must satisfy;
- define review acceptance criteria.

It MUST NOT:

- change runtime code;
- change database schema;
- change API contracts;
- change production behavior;
- merge itself;
- self-certify;
- claim the current UI already satisfies the doctrine.

## 4. Canon placement

Create:

`docs/100-experience/AUREUS-016 — STEWARD VOICE & INTERFACE CANON.md`

The new document is a Member Experience Level-3 canon. It expands `AUREUS-004 — THE STEWARD CANON` and supersedes only those same-level clauses in older Member Experience documents that it explicitly identifies as conflicting.

Where there is no conflict, existing canon remains in force.

No lower Product Architecture, engineering, work-order, or implementation document may override this canon.

## 5. Required doctrine

The canon must preserve, at minimum:

1. The interface is the Steward's body.
2. Every visible item must answer whose hands it is in.
3. Short, first-person, specific speech; real names and real numbers; no exclamation points.
4. Every ask includes the reason.
5. Every wait includes ownership, last chase, next chase, and an honest expectation where known.
6. Bad news never arrives naked; recovery or the next owned checkpoint is attached.
7. Never re-ask information Aureus already has unless a truthful re-verification is required and the reason is stated.
8. Aureus does not ask for more access until it has delivered value since the last access ask.
9. Delegation is reversible in both directions.
10. `Show me everything` remains persistently available as the member's back door.
11. The first experience gets the person's name and pronunciation right before doing anything else.
12. The first session completes one small useful thing when responsibly possible.
13. Waiting/silence is a designed first-class state.
14. Mission Rooms are scoped views of the same underlying work, not separate case systems.
15. Sharing is per-item, default-none, purpose-bound, and visible to the member.
16. Outside participants propose changes; they do not silently rewrite the member's Mission.
17. Guest links expire, are revocable, and write actions into the ledger.
18. Completion shows the ledger/testimony of work carried.
19. The work may end while belonging and human relationship remain.
20. Internal architecture language such as Mission, Life Map, workstream, and flourishing does not become member-facing jargon by default.

## 6. Explicit arrival supersession candidate

Subject to independent review, the new canon should supersede these conflicting clauses of `AUREA-002 — ARRIVAL CANON`:

- the fixed branded opening sequence;
- the rule that `How can we help?` is always the first meaningful interaction;
- any arrival behavior that requires a Hall reveal before help begins;
- any feature-tour implication inconsistent with the one-question-at-a-time empty opening surface.

The existing principles that help comes before administration, guest stewardship may begin without an account, requested information should have a purpose, no feature tour, accessibility, and first-session usefulness remain compatible unless a later review identifies a real conflict.

## 7. Implementation invariants for later code work

Future implementation derived from this canon must make these states representable and visually distinct:

`LISTENING → UNDERSTANDING → AGREEMENT → WORKING → ASKING → WAITING → CHOOSING → RECOVERING → DONE → QUIET`

The names are internal. Member-facing copy remains natural language.

Every carried item must be able to represent at least:

- current holder;
- member-defined or member-approved finish line where applicable;
- next action;
- reason for any member ask;
- waiting party when blocked externally;
- last chase and next chase when waiting;
- evidence/provenance of meaningful work;
- visibility/sharing scope;
- proposal state for outside changes;
- completion evidence.

This work order does not choose the final database model.

## 8. Acceptance criteria

The documentation slice is review-ready only when:

- the new canon exists on the dedicated branch;
- its content faithfully captures the Founder-authored doctrine;
- conflicts with older Member Experience canon are named explicitly rather than hidden;
- it does not claim implementation that does not exist;
- it does not weaken privacy, consent, truth, authority, or execution-assurance rules;
- the full diff is documentation-only;
- exact branch head SHA is reported;
- an independent reviewer examines the requirement, governing docs, full diff, and exact SHA;
- any repair is performed by the Constructor thread, after which the reviewer re-reviews the new exact head.

## 9. Constructor / reviewer separation

The Constructor may write and repair these files. It may not issue the final independent PASS on its own work.

The independent reviewer may inspect and report findings. If that reviewer edits the branch, it becomes a co-author and a different independent reviewer is required.

## 10. Founder decisions required

Independent review should call out only genuine unresolved authority questions. The principal Founder direction is already explicit in the supplied doctrine: the new Steward Voice & Interface model is intended to govern future experience work.

No merge occurs without the Founder's explicit decision after independent review.