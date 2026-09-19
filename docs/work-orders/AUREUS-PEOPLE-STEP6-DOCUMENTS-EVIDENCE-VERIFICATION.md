# AUREUS-PEOPLE-STEP6 — Documents, Evidence & Verification

**Program:** GitHub Issue #122 — PEOPLE-000
**Step:** 6 — Documents, Evidence & Verification
**Repository:** `Aureus1-dev/Aureus-V1`
**Original construction base:** `ff94fb532497a4e514222eb45b8a9109f6e4f1e8` (merge of People Step 4 / PR #139)
**Rebased onto:** `4a7497d261ed5bdaf1c8d6924fe69dfc9660016e` (People Step 5 / PR #141, now merged to `main`)
**Branch:** `claude/aureus-people-step-6-s7ccvp`
**Status:** Constructor repair complete — **DO NOT MERGE pending fresh independent review**

## Governance

People Step 5 (Obligation / Follow-through) has merged to `main`. Step 6 has been
rebased onto that merge commit and reconciled against the real Step 5
implementation rather than the placeholder assumptions this document originally
carried (see the retired §13 below). Required merge order remains Step 5 → Step 6
→ Step 7; Step 5 has now cleared that gate.

This is the product of three independent-review rounds: an initial adversarial
review of the pre-rebase candidate (2 BLOCKER + 4 HIGH), a post-Step-5-merge
re-audit of the same unmoved head (5 BLOCKER + 6 HIGH + 3 MEDIUM, superseding
the first), and an independent re-review of the first repair pass
(`8ee8ea00d26db3fad52100b8276e323379d3dbd7`) that found the first repair had
not fully closed two BLOCKER-level invariants and one HIGH provenance gap.
Every finding's disposition, across all three rounds, is recorded in §14.

The architectural boundary is now load-bearing, not aspirational: **Step 5 owns
Obligation/follow-through/deadlines/reminders/retries. Step 6 owns evidence
requirements, evidence items, verification history, provenance, validity, and
truthful live sufficiency. Step 6 does not, and structurally cannot, decide that
the underlying Personal Need has been resolved merely because evidence
requirements are adequate** — see §6.

No merge is authorized by this document. Claude (constructor) does not
self-approve. ChatGPT independently reviews the frozen, repaired Step 6
candidate. Founder alone authorizes merge.

## 1. Mission

Give Aureus a durable, truthful way to answer: *what proof or document is
required, what do we actually possess, where did it come from, what does it
prove, who verified it, is it still valid, and is it enough to say the work is
done?*

The core distinctions that must be preserved everywhere — persistence, services,
API, UI language, events, tests:

- a document existing is **not** evidence;
- evidence existing is **not** evidence being sufficient;
- someone asserting something is **not** independent verification;
- verification is **not** completion of the underlying `Responsibility`.

This is a cross-domain capability (housing, financial stewardship, legal/matter
stewardship, benefits, employment, healthcare administration, household
responsibilities, institutional navigation, future business uses), proved
end-to-end through one realistic housing case. It is not a housing-only system.

## 2. Reuse analysis (repository audit before persistence)

Performed against the base SHA before any schema change. Findings:

| Need | Existing primitive | Verdict |
|---|---|---|
| Canonical work outcome / ownership / privacy / status | `Responsibility` (`prisma/schema.prisma:645`) | **Reuse.** Evidence requirements attach to an existing `Responsibility`; Step 6 never becomes a second case system. |
| Append-only outcome ledger, evidence-strength vocabulary | `ResponsibilityEvent` + `ResponsibilityEventType.ACTION_EVIDENCED` + `ResponsibilityEvidenceLevel` (`REPORTED`/`VERIFIED`) | **Reuse.** Every meaningful Step 6 evidence transition is also written as a `ResponsibilityEvent` through the existing `ResponsibilitiesService`/`IResponsibilityRepository` contract — the same contract `legal-matters.service.ts` and `people-resolutions.service.ts` already call. Step 6 introduces no parallel event type. |
| Evidence-gated completion | `ResponsibilitiesService.completePersonalNeedWithEvidence()` / `exhaustPersonalNeedWithEvidence()` (`apps/api/src/responsibilities/responsibilities.service.ts:281`) | **Not reused — historical row, retained for context only.** The original slice called this as its only completion path; independent review correctly identified that as violating the Step 5/6 boundary (§6), and the repair removed the call and its route entirely. Step 6 does not call `completePersonalNeedWithEvidence()`/`exhaustPersonalNeedWithEvidence()` at all — nothing in this module can transition a `PERSONAL_NEED_RESOLUTION` Responsibility. |
| Artifact storage / upload metadata | `Document` (`prisma/schema.prisma:3711`) — opaque `storageRef`, owner-only, soft-deletable, no real cloud storage (ADR-014 Decision 5) | **Reuse.** Evidence items wrap an existing `Document` row rather than re-implementing file metadata. Step 6 adds no upload/storage machinery; it inherits the same limitation (`storageRef` is an opaque pointer — see §9 Known limitations). |
| Safe Document-to-work-item linkage | `LegalMatterDocumentLink` (`prisma/schema.prisma:837`) and `LegalMattersService.linkDocument()` | **Pattern reused, not the table itself.** `EvidenceItem.documentId` re-implements the identical ownership check (`document.userId === subjectUserId && deletedAt: null`) rather than importing the Legal-specific join table. |
| Append-only verification history with cached current-state fields | `CitySheetVerificationEvent` + `CitySheetEntry.verificationStatus/verifiedById/lastVerifiedAt` (`prisma/schema.prisma:3850`, `3946`) | **Pattern reused.** `EvidenceVerification` is append-only exactly like `CitySheetVerificationEvent`; `EvidenceRequirement.currentSufficiency`/`status` are recomputed, cached fields exactly like `CitySheetEntry`'s current-state fields — never the only record of what happened. |
| Sharing / third-party (Steward) access to private material | `AuthorityGrant` + `AuthorityService.evaluate()` gateway, `AuthorityResourceClass.DOCUMENT` **and** `OTHER` (`apps/api/src/authority/authority.service.ts`) | **Reuse, generalized.** A Steward may read, manage (open a requirement / submit on a member's behalf), or verify a member's evidence only with an ACTIVE `StewardshipRelationship` **and** a `PERMIT` from the existing Authority gateway — `resourceClass: DOCUMENT` scoped to the exact document for verification (unchanged), and `resourceClass: OTHER` scoped to the Responsibility for read (`purpose: 'people-step6-evidence-read'`) and manage (`purpose: 'people-step6-evidence-manage'`). No new `AuthorityResourceClass`/`AuthorityCapability` value was added — `OTHER` and existing `READ`/`WRITE` capabilities are reused exactly as the gateway already defines them. Step 6 adds no second permission ledger. |
| Current human ownership | `StewardshipRelationship` (ACTIVE) | **Reuse for context, never for authority.** The relationship identifies who is carrying the work; per merged Step 4 ("assignment does not grant access to private Responsibility evidence, documents, connected accounts, or consequential authority") it is never by itself sufficient for a read, manage, or verify decision — see the row above. |
| Household shared visibility | `HouseholdResponsibilityParticipant` (ACTIVE) | **Reuse rejected as an evidence-authorization bypass (post-review repair).** The original slice treated ACTIVE household participation as read-only evidence visibility; independent review (BLOCKER 3, both rounds) correctly identified this as contradicting the merged Step 3 contract, where `HouseholdResponsibilityParticipant` is coordination consent only and `dataAuthorityGranted` remains false. Household participation now grants **no** Step 6 access at all — not even the minimal projection, since no household-facing coordination surface consumes it in this slice. A future slice may expose a deliberately minimal, non-evidence coordination projection through the household domain if a real product need justifies it. |
| Role checks | `UserRole` / `RolesGuard` / `@Roles()` | **Reuse**, no new role. |
| Deadlines, reminders, callbacks, escalation scheduling, Obligations | `PeopleFollowThroughService`/`PeopleFollowThroughController` (People Step 5, merged) | **Owned exclusively by Step 5, never duplicated.** Step 6 does not read, write, or trigger any Step 5 state. The only relationship between the two steps is that both may describe the same `Responsibility`; Step 6 continues to only ever *report* truthful evidence state (`ADEQUATE`/`INSUFFICIENT`/expired/etc.) for Step 5 or any other governed consumer to read — see §5–6. |

**New persistence is justified only for:** (1) what evidence is required and why,
tied to a `Responsibility`, with an explicit sufficiency rule and cached current
state; (2) the append-only chain of what was actually supplied, including
supersession without mutation; (3) the append-only record of who verified what,
under what authority, with what result. No existing model represents these three
things generically across domains — `LegalMatterSource`/`LegalMatterFact` are
legal-specific, `CitySheetVerificationEvent` is City-Sheet-entry-specific, and
`ResponsibilityEvidenceLevel` is a two-value summary flag, not a requirement/item/
verification model.

No second case system, workflow engine, CRM, truth ledger, deadline engine, or
document-management universe is introduced.

## 3. Data model (new)

`prisma/schema.prisma` — new section "PEOPLE-STEP6 — Documents, Evidence &
Verification", after the `Document`/`StewardActivityLog` block:

- `EvidenceRequirement` — what is required, why, for which `Responsibility`,
  optional `requiredValidityDays`, `status` (`OPEN`/`SATISFIED`/
  `WAIVER_REQUESTED`/`WAIVED`/`CANCELLED` — `WAIVER_REQUESTED` added in repair,
  see §7) and cached `currentSufficiency` (`MISSING`/`PRESENT_UNVERIFIED`/
  `INSUFFICIENT`/`ADEQUATE`, exposed to API consumers as
  `cachedSufficiencyAtLastWrite` — renamed in repair, see §13 MEDIUM 3),
  denormalized `subjectUserId` (mirrors `LegalMatter.userId`) for direct
  authorization queries without joining `Responsibility` on every read.
- `EvidenceItem` — one supplied artifact/version. Wraps an existing `Document`
  (`documentId`, nullable) **or** carries an external/reference pointer
  (`externalSourceRef`/`externalSourceDescription`) for non-document evidence
  (e.g. a verified external record lookup). `origin` (`MEMBER_PROVIDED`/
  `STEWARD_PROVIDED`/`SYSTEM_PRODUCED`/`EXTERNAL_SOURCED`), `providedByUserId`
  (soft reference, matches the repo's `verifiedById` convention),
  `providedByActorClass` (reuses `ResponsibilityActorClass`). Self-referencing
  `supersedesItemId` (unique, 1:1) preserves a full replacement chain — a
  replacement is a new row, never a mutation of the old one. `validFrom`/
  `validUntil` carry validity/expiration. `integrityHash` is nullable and is
  **only ever populated from a real client-supplied hash of the artifact bytes**
  — never fabricated, never implied to be a stronger guarantee than "this is the
  hash the client told us it computed" (see §9).
- `EvidenceVerification` — append-only, one row per verification act. `result`
  (`VERIFIED`/`REJECTED`/`FLAGGED_FOR_REVIEW`), `method`
  (`HUMAN_STEWARD_REVIEW`/`PLATFORM_ADMIN_REVIEW`/`SYSTEM_RECORD_MATCH`/
  `EXTERNAL_ATTESTATION`), `performedByUserId` (soft reference), `actorClass`
  (reuses `ResponsibilityActorClass`), `authorityBasis` (a human-readable record
  of *why* this actor was allowed to verify — e.g. "ACTIVE StewardshipRelationship
  <id> + AuthorityGrant <id>"), `reason` (required when `result = REJECTED`).
  Never updated or deleted once written, exactly like `CitySheetVerificationEvent`.

New enums: `EvidenceRequirementStatus`, `EvidenceSufficiencyStatus`,
`EvidenceOrigin`, `EvidenceItemStatus`, `EvidenceVerificationResult`,
`EvidenceVerificationMethod`. `ResponsibilityActorClass` is reused, not
redefined.

Sufficiency is **not** duplicated truth: `EvidenceRequirement.currentSufficiency`
is a cache, recomputed transactionally by the service on every relevant write
(same pattern as `CitySheetEntry`'s cached verification fields). The append-only
`EvidenceItem`/`EvidenceVerification` rows are the source of truth; the cache
exists only for cheap reads.

## 4. Sufficiency rule (v1, explicit and narrow)

For one `EvidenceRequirement`:

- `MISSING` — no non-superseded, non-withdrawn `EvidenceItem` exists.
- `PRESENT_UNVERIFIED` — at least one current item exists, but none carries a
  `VERIFIED` `EvidenceVerification` as its most recent verification result, and
  no current item is validity-expired.
- `INSUFFICIENT` — the most recent verification of the current item is
  `REJECTED` or `FLAGGED_FOR_REVIEW`, **or** the only `VERIFIED` item has expired
  (`validUntil` in the past).
- `ADEQUATE` — the current item's most recent verification is `VERIFIED` **and**
  (no `validUntil` is set, or `validUntil` is in the future).

For a `Responsibility` as a whole: `ADEQUATE` only when every non-`WAIVED`/
non-`CANCELLED` `EvidenceRequirement` for it is individually `ADEQUATE`. One
missing or insufficient requirement blocks the whole aggregate — this is the
literal implementation of "never translate uploaded into done."

## 5. Step 5 integration seam

Step 6 exposes, and never consumes or schedules:

- `GET /people/evidence/responsibilities/:responsibilityId/summary` — the
  **read-only** Step 5/any-governed-consumer integration seam. Returns
  `aggregateSufficiency` (always computed live — see §13 MEDIUM 3) and a
  truthful `message`. The `requirements` array (full per-requirement detail)
  is present only for a caller with FULL read access (the subject, an
  administrator, or a Steward with an explicit Step-2 evidence-read grant —
  §7); a Steward with only an ACTIVE relationship receives the aggregate and
  message alone, with `requirements` omitted entirely (BLOCKER 3/4 repair).
- A `ResponsibilityEvent` (`ACTION_EVIDENCED`, `evidenceLevel: REPORTED` or
  `VERIFIED`, `sourceSystem: 'AUREUS_EVIDENCE'`, `sourceRecordType:
  'EvidenceRequirement'`/`'EvidenceItem'`) on every meaningful transition —
  requirement required/waiver-requested/waived, item submitted, item
  verified/rejected/flagged — written **atomically in the same transaction**
  as the Step-6 truth change it describes (HIGH 5 repair; see §13), so the
  Responsibility's own timeline (which Step 5 and any UI already read) can
  never fall out of sync with Step 6's own tables.

Integration tests (`evidence.e2e.spec.ts`, describe block "Step 5 / Step 6
boundary") now exercise the real merged Step 5 implementation end to end: a
Step-5 housing Obligation is driven to `SATISFIED_VERIFIED` through
`PeopleFollowThroughController`'s actual routes on the same `Responsibility`
that Step 6 independently brings to full `ADEQUATE` evidence, and the test
asserts the underlying Personal Need `Responsibility` remains open throughout
and after both. Step 5 does not currently consume Step 6's summary endpoint
for anything (no such call exists in the merged Step 5 code); if a future
slice wires that seam, it must bind consumption to a real, live Step-6
verification record rather than a caller-invented pointer.

Step 6 builds **no** reminder, callback, deadline, retry, escalation, or
follow-through scheduler. It never decides *when* someone should be nudged; it
only ever answers *what is currently true*.

## 6. Step 5/Step 6 boundary — no life-need completion path (post-review repair)

The original slice included `EvidenceService.attemptResponsibilityCompletion()`
and a `POST /people/evidence/responsibilities/:id/attempt-completion` route
that called `ResponsibilitiesService.completePersonalNeedWithEvidence()`
whenever every active evidence requirement was `ADEQUATE`. Independent review
(BLOCKER 2, post-Step-5-merge round) correctly identified this as violating
the now-real Step 5 contract: even a `SATISFIED_VERIFIED` Step-5 Obligation
does not prove the member's underlying life need was actually resolved, and
Step 6's own mission statement already says the same thing ("verification is
not completion of the underlying Responsibility"). Evidence adequacy — from
Step 6 alone, or Step 6 plus a satisfied Step 5 Obligation — is still not the
same fact as "the person's real-world need was resolved."

**Repair: the method and its route have been removed entirely**, not
narrowed. Step 6 is now structurally an evidence-truth provider only; nothing
in this module can transition a `PERSONAL_NEED_RESOLUTION` `Responsibility` to
`COMPLETED`, `CANCELLED`, or `RESPONSIBLY_EXHAUSTED`. The only remaining path
to that boundary is the existing source-domain outcome mechanism Step 1
already owns, unchanged and untouched by this slice.

Regression proof (`evidence.e2e.spec.ts`): every Step-6 evidence requirement
on a Responsibility reaches `ADEQUATE`; the real, merged Step-5 Obligation on
that same Responsibility reaches `SATISFIED_VERIFIED`; the underlying
Responsibility's `status` and `completedAt` are asserted unchanged throughout
and afterward; and a direct `POST .../attempt-completion` call now 404s
because the route no longer exists.

## 7. Authorization model (post-review repair)

- **Member (Responsibility principal):** create requirements is disallowed
  (requirements are opened by an authorized Steward or administrator — a
  member cannot invent their own proof requirement and self-satisfy it, `403`
  since they already know the Responsibility exists); may submit
  `MEMBER_PROVIDED` evidence items for their own requirements, subject to the
  server-enforced validity window (§ below); may read everything on their own
  Responsibility; **cannot verify their own evidence, and cannot verify
  evidence they themselves provided** (self-verification and
  self-provided-then-verified are both rejected — "someone asserting
  something is not independent verification," now checked against
  `providedByUserId`, not only Responsibility ownership — HIGH 4 repair);
  **may only request, never authoritatively decide, a waiver** of their own
  requirement (HIGH 1 repair, below).
- **Steward:** an ACTIVE `StewardshipRelationship` establishes who is
  carrying the work — it is never, by itself, evidence read, manage, or
  verification authority (merged Step 4: "assignment does not grant access to
  private Responsibility evidence, documents, connected accounts, or
  consequential authority"). Every Step-6 action a Steward takes additionally
  requires an explicit `AuthorityGrant` `PERMIT` from the existing Step-2
  gateway, scoped narrowly by purpose (HIGH 2 repair closes the
  create/submit gap the relationship alone previously allowed):
  - **Full read** (`listRequirements`/`getRequirement`/`summary`, including
    the aggregate sufficiency judgment and its message): `{capability: READ,
    resourceClass: OTHER, resourceRef: <responsibilityId>, purpose:
    'people-step6-evidence-read'}`. Without it, the Steward receives the
    not-found boundary on **all three** endpoints — an aggregate sufficiency
    judgment is itself private Responsibility evidence, not a lesser
    coordination fact, so there is no minimal or aggregate-only projection of
    any kind for a relationship-only Steward (§14, third-round BLOCKER 1
    repair; corrected from this document's own earlier, now-superseded
    claim that `summary` alone yielded such a projection).
  - **Manage** (open a requirement; submit `STEWARD_PROVIDED` evidence on the
    member's behalf): `{capability: WRITE, resourceClass: OTHER, resourceRef:
    <responsibilityId>, purpose: 'people-step6-evidence-manage'}`.
  - **Verify**: unchanged from the original design — `{capability: READ,
    resourceClass: DOCUMENT, resourceRef: <documentId>, purpose:
    'people-step6-evidence-verification'}`, scoped to the exact document, plus
    the same provider-independence check above.
- **Platform/System Administrator:** full read/manage/verify without the
  per-Responsibility/per-document grant (oversight parity with Step 4's admin
  queue visibility) and sole authority to authoritatively waive a requirement
  (§ below), but never sees raw `Document` content through this module — only
  requirement/item/verification metadata, mirroring Step 4's "minimum
  coordination facts" boundary. An administrator is still bound by the
  provider-independence check: they cannot verify evidence they themselves
  submitted (HIGH 4's explicit admin submit-then-self-verify case).
- **Household participant:** **no Step 6 access of any kind** (BLOCKER 3
  repair — removed entirely). `HouseholdResponsibilityParticipant` remains
  coordination consent only, per the merged Step 3 contract; it is never
  converted into private-evidence read authority, regardless of `ACTIVE`
  status. No replacement minimal projection is exposed in this slice, since no
  household-facing surface currently needs one.
- **Waiver authority (HIGH 1 repair):** the Responsibility principal may only
  create a `WAIVER_REQUESTED` record (recorded with `waivedByUserId`,
  `waivedReason`, `waivedAt` — the same fields an authoritative waiver uses,
  disambiguated by `status`); a `WAIVER_REQUESTED` requirement remains
  **active** for aggregate sufficiency purposes (never excluded, unlike
  `WAIVED`/`CANCELLED`), so a member cannot remove a difficult proof
  requirement from the aggregate merely by requesting a waiver. Only an
  administrator may transition a requirement (from `OPEN` or
  `WAIVER_REQUESTED`) to the authoritative `WAIVED` status that is excluded
  from aggregate sufficiency. Neither a member nor a Steward may authoritatively
  waive.
- **Terminal Responsibility guard (BLOCKER 5 repair):** once the underlying
  Responsibility is `COMPLETED`, `CANCELLED`, or `RESPONSIBLY_EXHAUSTED`, no
  caller — including an administrator — may create a requirement, submit an
  item, verify an item, or waive/request-waive a requirement. Reads
  (`listRequirements`/`getRequirement`/`summary`) remain available. No
  correction/reopen mechanism exists in this slice; one would need to be
  separately governed before any post-terminal evidence mutation could ever be
  allowed again.
- Everyone with no plausible standing at all: `404 Not Found` (never `403`),
  matching the repository's existing not-found-not-forbidden convention for
  cross-tenant probing resistance — now applied consistently on the mutation
  endpoints too (MEDIUM 1 repair): `verifyItem`/`createRequirement` previously
  returned `403` to an unrelated caller holding a known-valid ID, which
  distinguished existence from a genuine `404`. A caller who already has some
  standing (the Responsibility's own principal attempting a disallowed
  self-action, or an assigned Steward lacking a specific grant) still receives
  a reason-bearing `403`, since that reveals nothing they do not already know.
- **Validity window (HIGH 3 repair):** `submitItem` now rejects a future
  `validFrom`, rejects `validUntil < validFrom`, and — when the requirement
  declares `requiredValidityDays` — rejects any caller-supplied `validUntil`
  that would exceed `validFrom (or submission time) + requiredValidityDays`.
  A 90-day proof rule can no longer be stretched into years of validity by the
  caller.

## 8. First end-to-end proof (housing)

1. Member has an accepted `PERSONAL_NEED_RESOLUTION` `Responsibility` (housing).
2. Aureus/System opens an `EvidenceRequirement` ("Proof of current address",
   `requiredValidityDays: 90`) → `MISSING`.
3. Member uploads a `Document` (existing endpoint) and submits it as a
   `MEMBER_PROVIDED` `EvidenceItem` → `PRESENT_UNVERIFIED`. System truthfully
   reports "We received it. This has not been verified yet." There is no
   completion path to attempt at this Step 6 module boundary at all (§6).
4. An ACTIVE Steward without a Document grant attempts to verify → rejected
   (authority not established).
5. Member grants the Steward `READ`/`DOCUMENT` authority via the existing
   Authority gateway. Steward verifies with `REJECTED` + reason (wrong document
   type) → `INSUFFICIENT`. "This doesn't meet the requirement because …"
6. Member supersedes with a corrected item (old item preserved,
   `SUPERSEDED`, never deleted). Steward verifies `VERIFIED` → `ADEQUATE`.
   "This was checked … We now have the evidence required for this step."
7. The aggregate for the Responsibility reads `ADEQUATE`. This is where the
   original proof ended by calling `attemptResponsibilityCompletion`; that
   path no longer exists (§6). The Responsibility remains `ACTIVE`, and the
   proof continues by independently driving the real, merged Step 5
   implementation's Obligation on the same Responsibility to
   `SATISFIED_VERIFIED` — the Responsibility still remains open afterward,
   with or without Step 6's evidence being adequate.
8. Expiry path: a second requirement's only verified item has `validUntil` in
   the past → `INSUFFICIENT`, not `ADEQUATE`, even though a `VERIFIED` row
   exists in history ("This proof expired on …"). A related proof shows the
   cached `cachedSufficiencyAtLastWrite` field can lag `liveSufficiency` after
   time-based expiry with no intervening write, and that `summary`'s
   `aggregateSufficiency` is always computed live regardless.

## 9. Known limitations (truthfully stated, not fixed by this slice)

- `Document.storageRef` is an opaque pointer; this repository has no real file
  upload/byte-storage machinery yet (ADR-014 Decision 5, unchanged by Step 6).
  Step 6 therefore cannot make, and does not claim, any guarantee about file
  type, size limits, malware scanning, or filename/path safety of the
  underlying bytes — those protections do not exist anywhere in the platform
  today. `integrityHash` records only a client-asserted hash string; it is not
  independently computed from stored bytes and must not be presented as a
  cryptographic proof of content integrity.
- Steward authority checks reuse `AuthorityGrant`/`AuthorityCapability.READ`/
  `WRITE` against `AuthorityResourceClass.DOCUMENT` (verify) and `OTHER`
  (read/manage) exactly as Step 2 already defines them; Step 6 adds no new
  `AuthorityCapability`/`AuthorityResourceClass` value.
- Household members now have **no** Step 6 visibility of any kind (repaired —
  see §2/§7). This is a deliberate narrowing, not an oversight: no
  household-facing surface in this slice consumes evidence status, so no
  minimal projection was built speculatively. A future slice adding such a
  surface must design its own deliberately minimal, non-evidence projection
  rather than reopening the removed read-only bypass.
- An administrator's authoritative-waiver authority (§7) has no accompanying
  "deny/reopen a waiver request" action in this slice — a denied request
  simply stays `WAIVER_REQUESTED` (still active in the aggregate) until an
  administrator either waives it or a separately governed correction process
  is built. This is a real, acknowledged gap, not a claimed feature.
- Docker Build Verification could not be executed in this construction
  sandbox (egress to the Docker registry is blocked here, unchanged from the
  limitation the pre-repair candidate's PR description already recorded); it
  must be confirmed against real GitHub Actions CI on the pushed exact head.

## 10. Non-goals

- Step 5's Obligation/deadline/reminder/callback/escalation runtime.
- Step 7's Truth/Service Ledger UI.
- Real cloud file storage / malware scanning / OCR (unchanged platform gap).
- A generalized document-management product, CRM, or workflow engine.
- Business-tenant evidence (this slice is People-context; `EvidenceRequirement`/
  `EvidenceItem` attach to a `Responsibility` of any context type structurally,
  but only `PERSONAL_NEED_RESOLUTION` is proved and gated for authorization in
  this slice — a future business slice must repeat the reuse-first analysis
  rather than assume this one silently covers it).

## 11. Constructor gates (this repair pass, exact head recorded in the PR)

This is the **third** repair pass on this branch. The first repair pass
(head `8ee8ea00d26db3fad52100b8276e323379d3dbd7`) had its GitHub Actions run
(`35422904033`/`35422902305`) confirm both `Build & Test` and `Docker Build
Verification` green. The second repair pass (head
`e934ac18f75d9d6b3ff4fdeb444df9a1de1316ad`) had its own GitHub Actions run
confirm both checks green as well (jobs `105850788332`/`105850783678` and
`105851471462`/`105851444160`). This section now records the third repair
pass's own fresh local gate run:

- [x] Real `git rebase` remains intact from the first pass — no re-rebase was
      needed (this pass only adds commits on top; Step 5's merge base is
      unchanged)
- [x] `prisma migrate deploy` / `prisma generate` clean (no new schema/
      migration change this pass — the fix is entirely in-transaction
      re-reads, not new columns)
- [x] `pnpm run check-types` clean
- [x] `pnpm run lint` clean (0 errors; pre-existing warnings only, none newly
      introduced in `evidence/`)
- [x] `node contracts/product-v1/v1/validate-product-contracts.mjs` clean
- [x] `pnpm audit --audit-level high --ignore GHSA-ggr8-5vv4-36mx` clean
- [x] e2e tests green (`evidence.e2e.spec.ts` — 45 cases, including the three
      new deterministic-barrier concurrency races (A/B/C, §14 fourth round)
      and the hardened terminal-race regression, now using an explicit
      lock-acquisition signal instead of a fixed sleep)
- [x] Sanity-checked the three new race regressions against the pre-repair
      `evidence.service.ts` (temporarily reverted, tests unchanged): all
      three fail as expected (`201` instead of the required `409`),
      confirming they genuinely exercise the fixed defect rather than
      passing vacuously
- [x] full `pnpm --filter @aureus-v1/api run test:ci` green (exact CI
      command: **194 suites / 1966 tests**, serial, with coverage, on a
      fresh migrated — not pre-seeded — database)
- [x] `pnpm --filter @aureus-v1/web run test` green (**159 suites / 895
      tests**; no web changes; proves no regression)
- [x] `pnpm run build` (monorepo — shared + api + web) clean, 3/3 packages
- [x] `npx prisma db seed` (Founder Pilot seed synchronization) clean, run
      after tests as CI orders it
- [ ] Docker Build Verification — **could not run in this construction
      sandbox** for this exact new head (same unchanged registry-egress
      limitation); must be confirmed green in real GitHub Actions CI on the
      pushed exact head, as it already was for both prior heads.
- [x] no accidental unrelated diff — confirmed via `git status`: exactly the
      evidence module, controller OpenAPI text, and this work order (no
      schema/migration change this pass)
- [x] this work order agrees with the implementation
- [x] exact base/head SHAs recorded in the PR
- [ ] branch pushed (this repair pass)
- [ ] fresh independent review requested on the exact repaired head

## 12. Adversarial test plan (repaired)

IDOR/cross-member read; cross-household read (household participation now
grants **no** access at all, not read-only — BLOCKER 3); cross-tenant leakage;
forged evidence ownership (submitting an item against a `Document` the caller
does not own); forged verifier identity (unauthenticated/wrong-role verify
attempt); unauthorized read/manage/verification (ACTIVE Steward relationship
but no matching Authority grant, for each of the three narrowly-scoped
purposes — BLOCKER 4, HIGH 2); upload ≠ verification (`PRESENT_UNVERIFIED`
never reads as done); member self-verification rejected; **self-provided
verification rejected, including the administrator submit-then-self-verify
case** (HIGH 4); reported ≠ independently verified
(`ResponsibilityEvidenceLevel.REPORTED` never silently becomes `VERIFIED`);
insufficient evidence cannot satisfy a requirement; expired evidence cannot
satisfy current sufficiency even with a historical `VERIFIED` row, and the
cached sufficiency field can be shown to lag live truth after expiry with no
write (MEDIUM 3); evidence replacement preserves prior history (superseded row
never deleted/mutated); duplicate/idempotent submission; **future-dated
`validFrom`, reversed validity windows, and caller-supplied `validUntil`
beyond the requirement's policy window are all rejected** (HIGH 3); concurrent
verification (two verifications race — both persist, current state reflects
the later one, neither is lost, and each emits its own event); **terminal-
Responsibility manipulation is parameterized across `COMPLETED`/`CANCELLED`/
`RESPONSIBLY_EXHAUSTED` and asserts zero new Evidence rows and zero new
ResponsibilityEvents** (BLOCKER 5); **a member can only request, never
authoritatively create, a waiver, and a mere request does not remove the
requirement from aggregate sufficiency** (HIGH 1); household participant gets
the not-found boundary everywhere, including on verify; admin cannot read raw
Document content through this module and is still bound by the
provider-independence check; **known-valid-ID probing returns 404 rather than
403 for a caller with no standing, on both `createRequirement` and
`verifyItem`** (MEDIUM 1); **the full view exposes truthful
`providedByUserId`/`performedByUserId` attribution without claiming `SYSTEM`
performed a human act** (MEDIUM 2); Step 6 never writes a
scheduling/reminder/deadline record of its own; **an integration test drives
the real, merged Step 5 Obligation to `SATISFIED_VERIFIED` on the same
Responsibility Step 6 independently brings to full `ADEQUATE`, and asserts the
underlying Personal Need Responsibility remains open throughout and
afterward, with no `attempt-completion` route left to call** (the Step 5/6
boundary proof, §6); UI/API state agreement (the summary endpoint's aggregate
always matches the live per-requirement computation, never the cache).

## 13. Assumptions about Step 5 requiring reconciliation after freeze — resolved

This section originally recorded open assumptions written before Step 5
existed. Step 5 has since merged; each assumption is resolved below rather
than rewritten as if it had never been open:

- *"Step 5's Obligation model is expected to read Step 6's summary endpoint
  ..."* — **Resolved: it does not, in the merged Step 5 implementation.**
  `PeopleFollowThroughService` never calls into the `evidence` module. The
  integration test in §6 proves the two steps' independence directly rather
  than assuming a seam that does not exist. If a future slice wires Step 5 to
  consume Step 6 evidence as satisfaction proof, it must bind that consumption
  to a real, live Step-6 verification record (per the post-Step-5 re-audit's
  requirement 5), not a caller-invented pointer — no such binding exists yet
  and none is fabricated here.
- *"If Step 5 introduces its own Obligation model referencing evidence..."* —
  **Resolved: it does not reference `EvidenceRequirement` at all.** Step 5's
  `step5FollowThrough` contract lives entirely inside
  `Responsibility.successCriteria`, structurally separate from Step 6's own
  tables. No `obligationId` pointer was needed or added.
  `EvidenceRequirement` continues to key off `responsibilityId` alone, exactly
  as this document originally assumed would be the simpler outcome.
- *"Step 5 must not read Step 6's cached `currentSufficiency` as a scheduling
  trigger source..."* — **Resolved as moot for this exact concern** (Step 5
  reads no Step 6 field at all, per above) **and independently hardened
  regardless** (MEDIUM 3 repair): the cache is now exposed under the name
  `cachedSufficiencyAtLastWrite`, explicitly documented as write-triggered
  only, alongside an always-live `liveSufficiency`; `summary()`'s
  `aggregateSufficiency` is computed live unconditionally. Any future consumer
  reading the raw field name would see its staleness risk named in the type
  itself.

## 14. Independent-review finding disposition

Every BLOCKER/HIGH/MEDIUM from both independent-review rounds on this branch —
the initial review (`pullrequestreview-5253388788`, against pre-rebase head
`21581c17749f656f28444259f79ce44d2d17c56b`) and the post-Step-5-merge re-audit
(`pullrequestreview-5254339710`, against the same unmoved head) — is
dispositioned against this repair's exact head (recorded in the PR):

| Finding | Round | Disposition |
|---|---|---|
| BLOCKER — not reconciled onto merged Step 5 | Re-audit BLOCKER 1 | **Fixed.** Real `git rebase` onto `4a7497d261ed5bdaf1c8d6924fe69dfc9660016e`; zero conflicts (disjoint files); confirmed via `git merge-base`. |
| BLOCKER — Step 6 can complete the life-need Responsibility | Re-audit BLOCKER 2 | **Fixed.** `attemptResponsibilityCompletion()` and its route removed entirely (§6). Regression: ADEQUATE evidence + Step-5 `SATISFIED_VERIFIED` + Responsibility still open, proved against the real merged Step 5. |
| BLOCKER — household participation grants private-evidence read | Initial BLOCKER 1 / Re-audit BLOCKER 3 | **Fixed.** Household branch removed from `resolveReadAccess` entirely — no read of any kind. Regression: ACTIVE participant 404s on `getRequirement`/`listRequirements`/`summary`/`verifyItem`. |
| BLOCKER — terminal Responsibility remains evidence-mutable | Initial BLOCKER 2 / Re-audit BLOCKER 5 | **Fixed.** Centralized `assertNonTerminalResponsibility()` applied to `createRequirement`/`submitItem`/`verifyItem`/`waiveRequirement`. Regression: parameterized across all three terminal statuses; asserts zero new Evidence rows/events. |
| BLOCKER — ACTIVE StewardshipRelationship alone grants private-evidence read | Re-audit BLOCKER 4 | **Fixed.** `resolveReadAccess()` requires relationship **and** a Step-2 `OTHER`/`READ` grant (`people-step6-evidence-read`) for FULL access; relationship alone yields only the minimal `summary` projection (no `requirements` array). |
| HIGH — multi-requirement completion provenance dropped | Initial HIGH 1 / Re-audit HIGH 6 | **Retired from this slice.** No completion path survives in Step 6 (BLOCKER 2 disposition above), so the `supportingEvidence` persistence defect in the shared completion repository is no longer reachable from this module. The underlying repository defect (`PrismaResponsibilityRepository.completeWithEvidence()` discarding `supportingEvidence`) was not touched — it belongs to whichever caller still uses that path, if any, outside this slice. |
| HIGH — `requiredValidityDays` bypassable via caller-controlled dates | Initial HIGH 2 / Re-audit HIGH 3 | **Fixed.** `resolveEffectiveValidityWindow()` rejects future `validFrom`, rejects `validUntil < validFrom`, and rejects a caller `validUntil` beyond `validFrom-or-now + requiredValidityDays`. |
| HIGH — independent verification not independent of the provider | Initial HIGH 3 / Re-audit HIGH 4 | **Fixed.** `resolveVerificationAuthority()` rejects `providedByUserId === caller.id` for both the admin and Steward paths. Regression: admin submit-then-self-verify explicitly tested, including that a *different* admin can still verify the same item. |
| HIGH — evidence truth and shared ledger not atomic; event coverage incomplete | Initial HIGH 4 / Re-audit HIGH 5 | **Fixed.** Every `ResponsibilityEvent` write now happens inside the same `$transaction` as the Step-6 truth write it describes. Event coverage extended: `REJECTED`/`FLAGGED_FOR_REVIEW` now emit (previously only `VERIFIED` did); waiver-request and authoritative-waiver both emit. Expiry remains deliberately event-less — see the "narrowed, not built" note below. |
| HIGH — member waiver can bypass proof requirements | Re-audit HIGH 1 | **Fixed.** See §7 "Waiver authority." A member's waiver call now only ever produces `WAIVER_REQUESTED` (still active in the aggregate); only an administrator can produce authoritative `WAIVED`. |
| HIGH — Steward evidence mutation authority inconsistent with the work order | Re-audit HIGH 2 | **Fixed.** `assertCanManage()` and `resolveSubmissionOrigin()` both now require the Step-2 `people-step6-evidence-manage` grant in addition to the ACTIVE relationship, matching what this document already (incorrectly, until now) claimed was enforced. |
| MEDIUM — known-ID mutation paths leak existence via 403-vs-404 | Initial MEDIUM / Re-audit MEDIUM 1 | **Fixed.** `verifyItem`'s and `createRequirement`'s authority checks now resolve "any standing at all" first and return `404` for none, `403` only for a caller who already has standing (self, or a related-but-ungranted Steward). |
| MEDIUM — attribution/truth wording (SYSTEM mislabeling a human act) | Re-audit MEDIUM 2 | **Fixed via exposure, not relabeling.** `providedByUserId`/`performedByUserId` are now included in the full view alongside the unchanged `providedByActorClass`/`actorClass` (which continues to use the shared ledger's `SYSTEM` convention for any staff-mediated action, consistent with the platform-wide pattern Step 4/Step 5 already use). No new `ResponsibilityActorClass` value was added — the shared enum stays untouched — and the human identity is now truthfully visible next to it. |
| MEDIUM — `currentSufficiency` can be time-stale on expiry | Re-audit MEDIUM 3 | **Fixed via rename/containment, not a new expiry mechanism.** The API-facing field is now `cachedSufficiencyAtLastWrite`; `liveSufficiency` (already present) is the only field any decision may use; `summary()`'s aggregate is always computed live. No new cron/sweep was added — that would duplicate Step 5's exclusive ownership of scheduled work. |

**Narrowed, not built:** the work order previously implied a discrete
"expired" `ResponsibilityEvent`. This repair deliberately does not implement
one — doing so would require Step 6 to run its own time-based sweep, which
would duplicate Step 5's exclusive ownership of deadline/reminder/retry
scheduling (§2 reuse table). Expiry remains a purely computed function of
`validUntil` vs. current time, visible through `liveSufficiency` on every
read; the work order's event-coverage claim (§5) is narrowed accordingly
rather than left silently unmet.

**Also addressed, not independently numbered:** the first review's "other
observations" — `app.module.ts` cosmetic formatter churn beyond the two
`EvidenceModule` lines — has been reverted so the diff against `main` is
exactly those two lines.

### Third round — independent re-review of the first repair (`pullrequestreview-5254743571`, against head `8ee8ea00d26db3fad52100b8276e323379d3dbd7`)

The independent re-reviewer confirmed most prior findings were genuinely
repaired, but found two blocking invariants and one provenance gap that the
first repair pass had not fully closed:

| Finding | Disposition |
|---|---|
| BLOCKER 1 — relationship-only `summary` still discloses private Responsibility evidence (aggregate sufficiency + message) without the Step-2 grant | **Fixed.** The prior repair's "minimal aggregate-only projection" for a relationship-only Steward is removed entirely. `resolveReadAccess()`/`ReadAccess` (`FULL`/`STAFF_MINIMAL`) is replaced by a single `assertCanReadFull()` gate shared by `listRequirements`/`getRequirement`/`summary`; a relationship-only Steward now gets the not-found boundary on all three, with no lesser evidence projection anywhere. `EvidenceResponsibilitySummary.requirements` is no longer optional — every successful `summary()` call returns full detail, because only FULL access ever reaches a response. |
| BLOCKER 2 — terminal-Responsibility immutability has a TOCTOU race (check-then-transact, not inside the transaction) | **Fixed.** `assertNonTerminalResponsibility()` (a plain in-memory check against an already-loaded object, read before the transaction) is replaced by `lockNonTerminalResponsibility(tx, responsibilityId)`, which takes a `SELECT ... FOR UPDATE` row lock on the Responsibility as the first statement inside the same transaction as every evidence-truth write (`createRequirement`, `submitItem`, `verifyItem`, `waiveRequirement`). This serializes against any concurrent transaction that also touches the row (a plain Prisma `UPDATE` from another governed path takes the same row lock), closing the race. A new genuine-concurrency regression (not sequential) races a real `submitItem` HTTP call against a directly-issued terminalizing transaction that deliberately holds the row lock for a fixed window, and asserts the submission is rejected with `409` and produces zero Evidence rows/events. |
| HIGH — waiver request provenance is overwritten when an administrator decides | **Fixed.** `EvidenceRequirement` gains three new columns — `waiverRequestedByUserId`/`waiverRequestedReason`/`waiverRequestedAt` — populated only by a member's non-authoritative request and never touched by an administrator's later decision, which continues to use the pre-existing `waivedByUserId`/`waivedReason`/`waivedAt` triple exclusively. The two triples are now fully independent: a decision can never erase a request's who/why/when. Regression asserts both triples' values survive, unchanged, across the request→decision transition. |
| MEDIUM — repository truth/documentation still internally inconsistent | **Fixed.** The §2 reuse-table row for "Evidence-gated completion" is corrected to state the path is not reused/called at all (previously implied Step 6 was `completePersonalNeedWithEvidence()`'s first `VERIFIED` caller). §8 step 3's stale "Attempting completion … is rejected" sentence (from when the route still existed) is corrected to state there is no completion path to attempt. The controller's `waive` OpenAPI summary now distinguishes a principal's request from an administrator's authoritative decision. This §11 constructor-gate section's Docker line is updated below to record the real GitHub Actions confirmation the second head already received, rather than continuing to read as unconfirmed. |

No new authority universe, second workflow engine, or expiry scheduler was
introduced to close any of these — the fixes are exclusively: removing a
projection that shouldn't have existed, moving an existing check inside an
existing transaction with a standard row lock, adding three columns to
preserve already-computed provenance, and correcting stale prose.

### Fourth round — independent re-review of the second repair (against head `e934ac18f75d9d6b3ff4fdeb444df9a1de1316ad`)

The independent re-reviewer confirmed the Responsibility-level `SELECT ...
FOR UPDATE` repair (third round, BLOCKER 2) is directionally correct and
closes the terminal-Responsibility TOCTOU race, but found one remaining
blocking invariant: the subordinate `EvidenceRequirement`/`EvidenceItem`
state-machine checks in `waiveRequirement`, `submitItem`, and `verifyItem`
still read their mutable state *before* opening the transaction, then
continued to act on that pre-lock snapshot even after the Responsibility row
lock was acquired inside it.

| Finding | Disposition |
|---|---|
| BLOCKER — subordinate Requirement/Item state-machine checks remain outside the serialization boundary | **Fixed.** All three mutations already call `lockNonTerminalResponsibility(tx, responsibilityId)` as the first statement inside their transaction — this already fully serializes every Step-6 evidence-truth mutation on a given Responsibility (whichever transaction arrives second simply blocks on that row lock until the first commits). The defect was never a missing lock; it was that each method still decided its write using the `EvidenceRequirement`/`EvidenceItem` snapshot loaded *before* the transaction opened, rather than re-reading fresh state *after* the lock succeeded. `waiveRequirement` and `submitItem` now re-read the requirement's `status` with a plain `tx.evidenceRequirement.findUniqueOrThrow` immediately after `lockNonTerminalResponsibility` returns, and re-check the transition/acceptance rule against that fresh value before writing anything; `verifyItem` does the same for the target item's `status` via `tx.evidenceItem.findUniqueOrThrow`. Because the Responsibility lock already guarantees no concurrent Step-6 mutation is in flight past that point, a plain (non-`FOR-UPDATE`) re-read inside the same transaction is already race-free — no second lock level, lock subsystem, or workflow engine was added. The pre-transaction checks are kept only as non-authoritative fast-fails; a comment at each now says so explicitly. |

**Deterministic concurrency regressions (Race A/B/C, `evidence.e2e.spec.ts`,
new `describe` block "Fourth re-review — Requirement/Item state races behind
the Responsibility lock"):**

- **Race A** (administrative `WAIVED` vs. a stale member `WAIVER_REQUESTED`):
  a locked holder transaction commits an authoritative `WAIVED` decision
  while a real member waiver-request HTTP call is deliberately released to
  race behind it. Asserts the final status can never regress back to
  `WAIVER_REQUESTED`, the authoritative `waivedBy*` provenance triple
  survives untouched, the stale request receives `409`, its
  `waiverRequestedBy*` triple is never written, and exactly one
  `ResponsibilityEvent` (the admin's `WAIVED`) exists — no invalid
  `WAIVER_REQUESTED` event from the rejected stale request.
- **Race B** (administrative `WAIVED` vs. a real evidence submission): a
  locked holder transaction commits `WAIVED` while a real `submitItem` HTTP
  call races behind it. Asserts the requirement stays `WAIVED`, zero
  `EvidenceItem` rows exist for it, the submission receives `409`, and no
  `SUBMITTED` `ResponsibilityEvent` was ever appended.
- **Race C** (item supersession vs. verification of the now-stale item): a
  locked holder transaction supersedes the target item (mirroring
  `submitItem`'s own conditional-`updateMany` supersession) while a real
  admin `verifyItem` HTTP call races behind it, targeting the item being
  superseded. Asserts the old item stays `SUPERSEDED`, zero
  `EvidenceVerification` rows are attached to it, the verification call
  receives `409`, and no `VERIFIED` `ResponsibilityEvent` was appended for
  it.

Each of the three races was run against the pre-repair `evidence.service.ts`
(temporarily reverted, tests unchanged) and confirmed to fail as expected
(`201` instead of the required `409`) before the fix was restored — proving
the regressions genuinely exercise the defect rather than passing
vacuously.

**Hardened terminal-race regression (BLOCKER 2, third round):** the existing
regression's fixed ~500ms sleep and same-tick-dispatch-order assumption is
replaced by a shared `raceAgainstLockedMutation()` test harness. The holder
transaction signals a promise the instant its `SELECT ... FOR UPDATE` query
returns; the test `await`s that signal — proving, not assuming, the holder
already owns the lock — before ever dispatching the competing HTTP mutation.
Only after that is a short, explicitly non-safety-critical grace period
given (to let the competing request travel through HTTP/Nest/its own
pre-transaction reads and reach its own lock attempt, which then genuinely
blocks on the holder's lock) before the holder is released. This harness is
now shared by all four races (the original terminal-race regression plus
A/B/C above).

**Documentation/API truth repair:** §7's "Full read" bullet above is
corrected — it previously stated (incorrectly, carried over from an earlier,
already-superseded draft) that a relationship-only Steward without a Step-2
read grant still received "the minimal aggregate+message projection from
`summary`". The third round's BLOCKER 1 repair (disposition table above)
already removed that projection entirely; only this document's own §7 prose
had not been corrected to match. It now states plainly that such a Steward
receives the not-found boundary on all three read endpoints, with no
projection of any kind. The `summary` controller endpoint's OpenAPI
`@ApiOperation` description carried the identical stale claim
("...receives a deliberately minimal coordination-only projection") and is
corrected the same way.

No new authority universe, lock subsystem, or workflow engine was
introduced to close this round's finding — the fix is exclusively: moving
each mutation's decisive state read from before its transaction to
immediately after the Responsibility lock already taken inside it, and
correcting the two remaining stale prose statements the third round's
BLOCKER 1 fix had not yet propagated to.
