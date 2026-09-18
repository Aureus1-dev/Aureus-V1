# AUREUS-PEOPLE-STEP6 — Documents, Evidence & Verification

**Program:** GitHub Issue #122 — PEOPLE-000
**Step:** 6 — Documents, Evidence & Verification
**Repository:** `Aureus1-dev/Aureus-V1`
**Base:** `ff94fb532497a4e514222eb45b8a9109f6e4f1e8` (merge of People Step 4 / PR #139)
**Branch:** `claude/aureus-people-step-6-s7ccvp`
**Status:** Constructor implementation — **PARALLEL CONSTRUCTION, DO NOT MERGE**

## Governance

This is a parallel construction branch. People Step 5 (Obligation / Follow-through,
built by ChatGPT under `AUREUS-RME-001-REALITY-MATTER-OBLIGATION-FIRST-PROOF.md`)
has not merged yet. Required merge order is Step 5 → Step 6 → Step 7. Step 6 is
built so its core is cleanly isolated from unfinished Step 5: it depends only on
primitives already merged at the base SHA above (`Responsibility`,
`ResponsibilityEvent`, `Document`, `AuthorityGrant`, `StewardshipRelationship`,
`HouseholdResponsibilityParticipant`). It does not depend on, wait for, or invent
any deadline/reminder/Obligation concept — that remains Step 5's exclusive
territory. Once the exact Step 5 candidate is frozen, this branch is rebased onto
it and the seam (Step 6 emits verified evidence state; Step 5 owns when/whether to
act on it) is integration-tested against the real Step 5 code.

No merge is authorized by this document. Claude (constructor) does not
self-approve. ChatGPT independently reviews the frozen Step 6 candidate. Founder
alone authorizes merge.

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
| Evidence-gated completion | `ResponsibilitiesService.completePersonalNeedWithEvidence()` / `exhaustPersonalNeedWithEvidence()` (`apps/api/src/responsibilities/responsibilities.service.ts:281`) | **Reuse verbatim, no signature change.** Every existing caller (`legal-matters.service.ts:261`, `people-resolutions.service.ts`) only ever supplies `evidenceLevel: REPORTED`. Step 6 is the first caller that can genuinely supply `VERIFIED`, because it is the first domain with an independent-verification record behind it. |
| Artifact storage / upload metadata | `Document` (`prisma/schema.prisma:3711`) — opaque `storageRef`, owner-only, soft-deletable, no real cloud storage (ADR-014 Decision 5) | **Reuse.** Evidence items wrap an existing `Document` row rather than re-implementing file metadata. Step 6 adds no upload/storage machinery; it inherits the same limitation (`storageRef` is an opaque pointer — see §9 Known limitations). |
| Safe Document-to-work-item linkage | `LegalMatterDocumentLink` (`prisma/schema.prisma:837`) and `LegalMattersService.linkDocument()` | **Pattern reused, not the table itself.** `EvidenceItem.documentId` re-implements the identical ownership check (`document.userId === subjectUserId && deletedAt: null`) rather than importing the Legal-specific join table. |
| Append-only verification history with cached current-state fields | `CitySheetVerificationEvent` + `CitySheetEntry.verificationStatus/verifiedById/lastVerifiedAt` (`prisma/schema.prisma:3850`, `3946`) | **Pattern reused.** `EvidenceVerification` is append-only exactly like `CitySheetVerificationEvent`; `EvidenceRequirement.currentSufficiency`/`status` are recomputed, cached fields exactly like `CitySheetEntry`'s current-state fields — never the only record of what happened. |
| Sharing / third-party (Steward) access to private material | `AuthorityGrant` + `AuthorityService.evaluate()` gateway, `AuthorityResourceClass.DOCUMENT` (`apps/api/src/authority/authority.service.ts`) | **Reuse.** A Steward may verify a member's evidence only with an ACTIVE `StewardshipRelationship` **and** a `PERMIT` from the existing Authority gateway for `{capability: READ, resourceClass: DOCUMENT, resourceRef: <documentId>, subjectUserId: <member>}`. Step 6 adds no second permission ledger. |
| Current human ownership | `StewardshipRelationship` (ACTIVE) | **Reuse**, exactly the query Step 4's `human-steward-operations.service.ts` already uses. |
| Household shared visibility | `HouseholdResponsibilityParticipant` (ACTIVE) | **Reuse.** Read-only visibility of a Responsibility's evidence state extends to an ACTIVE household participant of that specific Responsibility; verification authority does not. |
| Role checks | `UserRole` / `RolesGuard` / `@Roles()` | **Reuse**, no new role. |
| Deadlines, reminders, callbacks, escalation scheduling | *(none — deliberately)* | **Not built.** Explicitly Step 5's territory (`PEOPLE-STEWARD-001-HUMAN-STEWARD-OPERATIONS.md` §"PA-023 platform alignment": *"the previously planned Step-5 deadline/reminder/callback work should be implemented as the first sourced Obligation slice"*). Step 6 only ever *reports* truthful state (`ADEQUATE`/`INSUFFICIENT`/expired/etc.) for something else to act on. |

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
  optional `requiredValidityDays`, cached `status` (`OPEN`/`SATISFIED`/`WAIVED`/
  `CANCELLED`) and `currentSufficiency` (`MISSING`/`PRESENT_UNVERIFIED`/
  `INSUFFICIENT`/`ADEQUATE`), denormalized `subjectUserId` (mirrors
  `LegalMatter.userId`) for direct authorization queries without joining
  `Responsibility` on every read.
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

- `GET /people/evidence/responsibilities/:responsibilityId/summary` — truthful
  per-requirement and aggregate sufficiency for the whole Responsibility, for
  Step 5's future Obligation-completion-evidence check (referenced by
  `AUREUS-RME-001-REALITY-MATTER-OBLIGATION-FIRST-PROOF.md` §7–8: *"independent
  evidence of the intended real-world result"*) or any other caller to read.
- A `ResponsibilityEvent` (`ACTION_EVIDENCED`, `evidenceLevel: REPORTED` or
  `VERIFIED`, `sourceSystem: 'AUREUS_EVIDENCE'`, `sourceRecordType:
  'EvidenceRequirement'`/`'EvidenceItem'`) on every meaningful transition —
  requirement satisfied, item submitted, item verified/rejected, item expired —
  written through the existing `ResponsibilitiesService`/repository contract, so
  the Responsibility's own timeline (which Step 5 and any UI already read) is
  truthful without Step 6 inventing a second timeline.

Step 6 builds **no** reminder, callback, deadline, retry, escalation, or
follow-through scheduler. It never decides *when* someone should be nudged; it
only ever answers *what is currently true*.

## 6. Completion guard (proved, not claimed)

`EvidenceService.attemptResponsibilityCompletion()` is the only path by which
Step 6 calls the existing `ResponsibilitiesService.completePersonalNeedWithEvidence()`.
It:

1. loads the caller-owned `PERSONAL_NEED_RESOLUTION` `Responsibility`
   (`ResponsibilitiesService.findOwnedPersonalNeedResolution`, unchanged);
2. computes the aggregate sufficiency described in §4 — **live**, from the
   append-only records, not from the cached field, so a stale cache can never
   authorize completion;
3. if any requirement is not `ADEQUATE`, throws with a truthful member-facing
   reason ("We still need …") and calls nothing on `Responsibility`;
4. only if every requirement is `ADEQUATE` does it call
   `completePersonalNeedWithEvidence(responsibilityId, caller, { evidenceLevel:
   VERIFIED, sourceSystem: 'AUREUS_EVIDENCE', sourceRecordType:
   'EvidenceRequirement', sourceRecordId: <primary requirement>,
   supportingEvidence: [...one reference per remaining requirement] })`,
   producing one `ACTION_EVIDENCED` ledger row per requirement, exactly the
   existing `supportingEvidence` contract `responsibility.repository.interface.ts`
   already defines.

This is the first caller of `completePersonalNeedWithEvidence` in the repository
that supplies `evidenceLevel: VERIFIED` from a genuine independent-verification
record rather than `REPORTED` member self-report.

## 7. Authorization model

- **Member (Responsibility principal):** create requirements is disallowed
  (requirements are opened by Aureus/System/Steward — a member cannot invent
  their own proof requirement and self-satisfy it); may submit `MEMBER_PROVIDED`
  evidence items for their own requirements; may read everything on their own
  Responsibility; **cannot verify their own evidence** (self-verification is
  rejected — "someone asserting something is not independent verification").
- **Steward:** may submit `STEWARD_PROVIDED` items and verify evidence for a
  member **only** when both hold: an ACTIVE `StewardshipRelationship` with that
  member, **and** an existing `AuthorityGrant` `PERMIT` from
  `AuthorityService.evaluate()` for `{contextType: PERSONAL, subjectUserId:
  <member>, capability: READ, resourceClass: DOCUMENT, resourceRef:
  <documentId>, purpose: 'people-step6-evidence-verification'}`. The
  relationship alone is deliberately insufficient — this is the literal
  implementation of "a Human Steward relationship must not grant unlimited
  access automatically."
- **Platform/System Administrator:** may verify (oversight parity with Step 4's
  admin queue visibility) without the per-document grant, but never sees raw
  `Document`/`extractedText` content through this module — only requirement/
  item/verification metadata, mirroring Step 4's "minimum coordination facts"
  boundary.
- **Household participant:** an ACTIVE `HouseholdResponsibilityParticipant` on
  the specific `Responsibility` gets **read-only** visibility of requirement/
  sufficiency state (not raw `Document` content, not verification authority).
- Everyone else: `404 Not Found` (never `403`, matching the repo's existing
  not-found-not-forbidden convention for cross-tenant probing resistance).

## 8. First end-to-end proof (housing)

1. Member has an accepted `PERSONAL_NEED_RESOLUTION` `Responsibility` (housing).
2. Aureus/System opens an `EvidenceRequirement` ("Proof of current address",
   `requiredValidityDays: 90`) → `MISSING`.
3. Member uploads a `Document` (existing endpoint) and submits it as a
   `MEMBER_PROVIDED` `EvidenceItem` → `PRESENT_UNVERIFIED`. System truthfully
   reports "We received it. This has not been verified yet." Attempting
   completion at this point is rejected.
4. An ACTIVE Steward without a Document grant attempts to verify → rejected
   (authority not established).
5. Member grants the Steward `READ`/`DOCUMENT` authority via the existing
   Authority gateway. Steward verifies with `REJECTED` + reason (wrong document
   type) → `INSUFFICIENT`. "This doesn't meet the requirement because …"
6. Member supersedes with a corrected item (old item preserved,
   `SUPERSEDED`, never deleted). Steward verifies `VERIFIED` → `ADEQUATE`.
   "This was checked by … We now have the evidence required for this step."
7. `attemptResponsibilityCompletion` succeeds; `Responsibility.status =
   COMPLETED`; `ResponsibilityEvent` shows `ACTION_EVIDENCED`
   (`evidenceLevel: VERIFIED`) then `COMPLETED`.
8. Expiry path: a second requirement's only verified item has `validUntil` in
   the past → `INSUFFICIENT`, not `ADEQUATE`, even though a `VERIFIED` row
   exists in history ("This proof expired on …").

## 9. Known limitations (truthfully stated, not fixed by this slice)

- `Document.storageRef` is an opaque pointer; this repository has no real file
  upload/byte-storage machinery yet (ADR-014 Decision 5, unchanged by Step 6).
  Step 6 therefore cannot make, and does not claim, any guarantee about file
  type, size limits, malware scanning, or filename/path safety of the
  underlying bytes — those protections do not exist anywhere in the platform
  today. `integrityHash` records only a client-asserted hash string; it is not
  independently computed from stored bytes and must not be presented as a
  cryptographic proof of content integrity.
- Steward verification authority checks `AuthorityGrant` capability `READ`
  against the `DOCUMENT` resource class exactly as Step 2 already defines it;
  Step 6 adds no new `AuthorityCapability`/`AuthorityResourceClass` value.
- Household read-only visibility is scoped to `HouseholdResponsibilityParticipant`
  status `ACTIVE`; it does not implement `PEOPLE-HOUSE-001`'s broader continuity
  model beyond what already exists at the base SHA.

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

## 11. Constructor gates (must be green at one exact head SHA before review)

- [ ] `prisma migrate deploy` / `prisma generate` clean
- [ ] `pnpm check-types` clean
- [ ] `pnpm lint` clean under repository policy
- [ ] focused unit tests green (`evidence.service.spec.ts`)
- [ ] integration tests green (`evidence.integration.spec.ts`, real Postgres)
- [ ] e2e tests green (`evidence.e2e.spec.ts`), including the full adversarial
      list in §12
- [ ] full `pnpm --filter @aureus-v1/api run test --coverage` green
- [ ] `pnpm --filter @aureus-v1/web run test` green (no web changes expected;
      proves no regression)
- [ ] `pnpm build` (monorepo) green
- [ ] Docker Build Verification green
- [ ] no accidental unrelated diff
- [ ] this work order agrees with the implementation
- [ ] exact base/head SHAs recorded below
- [ ] branch pushed publicly
- [ ] draft PR opened, explicitly marked **DO NOT MERGE — Step 5 predecessor not
      yet merged**

## 12. Adversarial test plan

IDOR/cross-member read; cross-household read; cross-tenant leakage; forged
evidence ownership (submitting an item against a `Document` the caller does not
own); forged verifier identity (unauthenticated/wrong-role verify attempt);
unauthorized verification (ACTIVE Steward relationship but no Authority grant);
upload ≠ verification (`PRESENT_UNVERIFIED` never reads as done); member
self-verification rejected; reported ≠ independently verified
(`ResponsibilityEvidenceLevel.REPORTED` never silently becomes `VERIFIED`);
insufficient evidence cannot satisfy a requirement; expired evidence cannot
satisfy current sufficiency even with a historical `VERIFIED` row; evidence
replacement preserves prior history (superseded row never deleted/mutated);
duplicate/idempotent submission; concurrent verification (two verifications
race — both persist, current state reflects the later one, neither is lost);
terminal-Responsibility manipulation (no requirement/verification mutates a
`COMPLETED`/`CANCELLED`/`RESPONSIBLY_EXHAUSTED` Responsibility's evidence into
retroactively changing its outcome); household participant cannot verify;
admin cannot read raw Document content through this module; Step 6 never
writes a scheduling/reminder/deadline record of its own; Step 6 never calls
Step 5/Obligation code (none exists at this base to call); UI/API state
agreement (the summary endpoint's sufficiency exactly matches what the
completion attempt would decide).

## 13. Assumptions about Step 5 requiring reconciliation after freeze

- Step 5's Obligation model is expected to read Step 6's summary endpoint (or an
  equivalent) as its "independent evidence of the intended real-world result"
  per `AUREUS-RME-001` §7–8. The exact method name/shape may need renaming to
  match whatever contract Step 5 actually freezes.
- If Step 5 introduces its own `Obligation` model referencing evidence, a
  follow-up slice (post-rebase) should decide whether `EvidenceRequirement`
  gains an optional `obligationId` pointer or whether Step 5 queries by
  `responsibilityId` alone (this slice assumes the latter, to avoid coupling to
  an unmerged schema).
- Step 5 must not read Step 6's cached `currentSufficiency` as a scheduling
  trigger source without also respecting §4's live recomputation — the cache is
  for cheap reads, not a queue.
