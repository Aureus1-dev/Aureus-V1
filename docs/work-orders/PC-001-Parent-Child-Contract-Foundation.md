# PC-001 — Parent + Child Relationship Authority & Work-Contract Foundation

**Status:** Implementation candidate  
**Repository:** Aureus-V1  
**Base:** `818baefb80794740e81c39d415d468b1b4ab092d`  
**Branch:** `feat/parent-child-governed-practice`  
**Parent architecture:** PA-021 Responsibility architecture + frozen Parent + Child loop

## Objective

Create the smallest mergeable foundation required before Parent + Child can safely add governed learning work:

1. a guardian-child authority relationship that is not active until the guardian attests and the child affirmatively assents;
2. revocable relationship authority with history preserved;
3. an immutable, versioned Responsibility Work Contract envelope;
4. an explicit real-stake requirement;
5. a launch gate keeping all `/family` APIs unreachable by default.

Responsibility remains the canonical work root. PC-001 does **not** create ChildTask, Pursuit, Activity, or another workflow engine.

## Behavioral guarantees

- Parent/guardian and child remain ordinary Aureus Users; no global PARENT or CHILD role is introduced.
- A pending relationship grants no authority.
- An unrelated member cannot assent to or revoke another pair's relationship.
- Either party may revoke.
- A later relationship requires a fresh proposal rather than rewriting revoked history.
- A Work Contract can be created only for a PERSONAL Responsibility whose principal is the child and only while the guardian-child relationship is ACTIVE.
- Every Work Contract requires at least one real stake.
- Work Contract rows cannot be updated. Renegotiation creates version N+1 with an explicit reason.
- Contract deletion remains possible through Responsibility/User lifecycle cascades so privacy deletion is not blocked.
- `/family` returns 404 while `parentChild` is false.

## Explicit non-goals

- no PRACTICE Responsibility kind yet;
- no parent-assigned work API yet;
- no evidence submission or verifier yet;
- no capability memory yet;
- no child-facing work UI;
- no parent result UI;
- no photo/video/audio/file capture;
- no transcript sharing;
- no production-minor activation;
- no claim that legal guardian verification is complete.

## Review gate

PC-001 is ready for independent review only when Prisma generate/migrate, API tests, web tests, typecheck, lint, build, and Docker verification are green at one frozen head SHA. Builder self-review is not authoritative. The independent critic must specifically attack relationship spoofing, consent bypass, contract mutation, missing stake, cross-principal contract creation, feature-gate bypass, and schema/migration drift.
