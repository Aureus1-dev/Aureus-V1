# OR-CCT-001 — Completion Case Transition Gate

**Status:** Post-merge architecture follow-up candidate  
**Applies to:** any transition of a Responsibility or useful work state across Aureus principal/context boundaries  
**Initial high-risk case:** Business/customer/shared transaction → Personal/private Aureus  
**Does not authorize:** implementation, data movement, browser/computer use, consequential action, production-data transfer, or deployment

## 1. Purpose

Aureus is one recognizable Steward across contexts, but one recognizable Steward must never imply one undifferentiated data space.

A person may first meet Aureus while acting as a customer of a business, then later ask Aureus to help with a separate personal matter. That continuity can be valuable, but it creates a sharp privacy and authority boundary.

This gate defines the minimum mechanism that must exist **before any implementation may copy or transition work or data from one principal/context into another**.

The governing rule is:

> Continuity may cross contexts only through an explicit, policy-enforced transition. Identity continuity is never transfer authority.

## 2. Definitions

### Source context

The current context in which the information or Responsibility exists.

Examples:

- business-tenant private;
- business-customer shared transaction;
- employer/employee;
- personal/private;
- family/representative relationship.

### Destination context

The new context in which Aureus is being asked to continue or create work.

### Completion Case transition

A governed creation of a new or continued Responsibility in a different Principal/context when the person explicitly asks Aureus to carry separate unfinished work.

A transition is **not**:

- a silent memory copy;
- an account-growth conversion;
- a tenant data export;
- a background profile merge;
- a model inference that the same person "probably wants this remembered."

## 3. Required transition sequence

Before any cross-context transfer is allowed, the system must satisfy all of these steps:

1. **Explicit user-affirmed request**
   - The person must ask Aureus to continue/carry the work in the destination context.
   - Mere continued conversation, identity match, login, or account creation is insufficient.

2. **Destination Principal/context established**
   - The destination Principal and context are created or resolved explicitly.
   - The source Principal/context remains intact and separately governed.

3. **Consent/authority artifact recorded**
   - Record the exact transition being authorized.
   - Bind it to source context, destination context, user/authorized actor, scope, timestamp, policy version, and revocation/expiry where applicable.
   - Model text is not the authority artifact.

4. **Candidate transfer set constructed**
   - Enumerate the specific fields/records proposed for transfer.
   - Classify each item by source, sensitivity, audience, provenance, and necessity.

5. **Deny-by-default field policy applied**
   - Nothing transfers merely because it exists in the source context.
   - An explicit allowlist decides what may cross.
   - Field stripping/redaction happens before destination persistence or model exposure.

6. **Context Firewall enforcement**
   - The destination model/tool/resource receives only the minimum approved destination context.
   - Source-private material not approved for transfer remains inaccessible.

7. **Destination Responsibility created or linked**
   - The destination Responsibility records the new Principal/context and transition provenance.
   - The source Responsibility remains authoritative for its original context.

8. **Append-only transition evidence recorded**
   - Record request, policy decision, allowlisted transfer set, denied fields/classes, resulting destination reference, actor, timestamp, and policy version.

9. **User-visible confirmation**
   - Aureus clearly states what it carried forward in ordinary language where useful.
   - It does not imply that the entire prior context moved.

## 4. Default-denied classes

The following may not cross from a Business/shared context into a Personal/private context merely because the same human appears in both:

- business-private notes;
- internal pricing authority, margins, discount floors, or negotiation instructions;
- employee-only notes or performance data;
- internal CRM annotations;
- proprietary business process data;
- trade secrets;
- internal model/tool traces;
- raw credentials, tokens, secrets, payment data, or authentication artifacts;
- third-party personal data;
- hidden risk/fraud/moderation annotations where disclosure is not authorized;
- private communications between business staff;
- raw uploads/documents beyond what the person supplied or is authorized to receive;
- inferred personality/sensitivity labels;
- private chain-of-thought.

The inverse Personal/private → Business direction is also deny-by-default and requires its own explicit allowlist and authority.

## 5. Potentially transferable classes

A transfer policy may allow narrowly scoped information such as:

- information the person directly supplied and is entitled to reuse;
- public or independently verified facts;
- shared transaction facts already visible to the person;
- the person's own stated goal or request;
- user-selected documents;
- a minimal summary specifically generated for the destination context;
- completion status the user has chosen to carry forward.

Eligibility is not automatic authorization. The transition artifact and policy still decide the exact transfer.

## 6. Server-side enforcement

The transition must be enforced outside the model.

A model may:

- recognize that a personal continuation could help;
- explain the option;
- propose a transfer set;
- ask the person whether they want to continue.

A model may not:

- create its own authority;
- widen the allowlist;
- reinterpret an ambiguous answer as consent;
- copy source-private fields because they are useful;
- use Responsible Continuation to route around a denied transfer.

The policy gateway must return an explicit permit/deny result for the exact transfer set.

## 7. Responsibility Passport interaction

A cross-context transition requires either:

- a new Responsibility Passport for the destination Responsibility; or
- an explicitly authorized destination-scoped derivative under a future versioned Passport design.

The source Passport never automatically governs the destination context.

Authority, privacy, spend, evidence, resource, and expiry constraints must be recalculated for the destination Principal/context.

## 8. Responsible Continuation rule

If the requested transfer is denied, Aureus preserves the underlying user outcome and searches for an authorized path.

Examples:

- ask the person to restate only the needed personal fact;
- ask the person to upload a document directly into personal Aureus;
- create a destination Responsibility with no source data and continue from there;
- provide instructions for the person to retrieve information they are authorized to access.

Responsible Continuation may change the route.

It may not change a denied field into an allowed field.

## 9. Evidence and audit

Every successful transition should be reconstructable from evidence:

- source Principal/context;
- destination Principal/context;
- user/authorized actor;
- explicit request/consent reference;
- exact allowed fields/classes;
- exact denied/stripped fields/classes where practical;
- policy/version;
- source records/provenance;
- destination Responsibility;
- time;
- revocation/deletion consequences where applicable.

Do not store raw secrets or private chain-of-thought in transition evidence.

## 10. Revocation and correction

The implementation design must define, before production:

- how a user corrects transferred facts;
- how revocation affects future use;
- whether copied destination data is deleted, tombstoned, or retained under a lawful requirement;
- what happens to backups;
- whether already-completed external actions can be reversed;
- how downstream derived summaries are corrected.

Do not silently promise perfect deletion before the production retention/forgetting policy is approved.

## 11. Minimum deny-path test matrix

Any implementation that can cross this boundary must prove at least:

1. same identity without explicit transition request → DENY;
2. login/account creation alone → DENY;
3. ambiguous "remember this" without destination scope → DENY;
4. business-private note in candidate set → STRIP/DENY;
5. internal pricing/margin field → STRIP/DENY;
6. personal-private field proposed for Business destination → STRIP/DENY unless separately authorized;
7. expired/revoked transition approval → DENY;
8. model proposes a wider transfer than policy artifact → DENY wider fields;
9. Responsible Continuation proposes a new route after denial → original denied data remains DENIED;
10. allowed shared transaction fact + valid transition artifact → ALLOW only exact approved field;
11. destination Responsibility access by wrong user/tenant → DENY;
12. source Responsibility remains unchanged and correctly scoped after destination creation;
13. audit event records policy/version/provenance without secrets;
14. retry/idempotency does not duplicate the transition or widen scope.

## 12. Implementation sequencing

### OR-001

**Not in scope.**

OR-001 must prove the thin Responsibility Core and cross-user/cross-tenant deny paths, but it must not implement cross-context transfer.

### OR-002 / People help-to-completion

A future OR-002 implementation may introduce the first narrow transition only if a real product journey requires it and this gate has a concrete server-side design.

A business-site visitor must not be forced into personal Aureus as a growth funnel.

### Later Business/People continuity

Additional transition directions require domain-specific policy and tests rather than assuming the first policy generalizes safely.

## 13. Acceptance gate

No implementation PR may introduce a Business/shared ↔ Personal/private data transition unless its review packet proves:

- explicit destination Principal/context;
- user-affirmed transition request;
- recorded consent/authority artifact;
- deny-by-default field allowlist/stripping;
- Context Firewall enforcement;
- server-side policy decision;
- new destination Passport/authority scope;
- transition provenance/evidence;
- minimum deny-path test matrix;
- retention/correction behavior for the transferred data;
- independent review of the exact implementation head.

Until then, the correct behavior is to keep the contexts separate and ask the person for the minimum information needed in the destination context.
