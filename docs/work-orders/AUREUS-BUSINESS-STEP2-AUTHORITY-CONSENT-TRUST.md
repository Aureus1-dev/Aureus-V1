# AUREUS BUSINESS — STEP 2: AUTHORITY, CONSENT & TRUST

**Base:** `818baefb80794740e81c39d415d468b1b4ab092d`

## Single job

Establish the machine-enforced trust boundary through which Aureus may **see, listen, read, write, share, or act**.

This slice does not build Responsibilities, Foundry, owner dashboards, employee My Day, customer journeys, Ward, or business process automation. It establishes the permission layer those capabilities must pass through.

## Product contract

1. **Ask before new authority.** Aureus may propose a permission; it may never grant itself one.
2. **Permission is specific.** Every grant is bound to a person/organization context, capability, resource class/resource reference, purpose, policy version, and optional expiry.
3. **Taking permission back is immediate.** Revocation must affect the next gateway decision without cache delay.
4. **Authority falls faster than it rises.** “Aureus shouldn’t have done this” immediately suspends the capability class for that scope until a human explicitly restores it.
5. **Private means private.** An employer cannot approve microphone, screen, or private-conversation access for an employee. Private transcript sharing requires the person’s explicit approval and an exact conversation reference; there is no blanket employer transcript permission.
6. **Business authority is tenant-bound.** Organization authority never leaks across organizations or into Personal Aureus.
7. **No model authority.** A model may create a permission request or propose an action; only the policy gateway decides whether execution is permitted.
8. **No secrets in the authority ledger.** Grants store opaque resource references and purpose/constraint metadata, never passwords, OAuth tokens, API keys, recovery codes, or credential material.
9. **Observable and understandable.** Members can see pending requests, active permissions, suspensions, and recent authority history in plain language.
10. **Existing arrival consent remains separate.** `ConsentRecord` continues to mean acceptance of arrival expectations; it is not repurposed as runtime action authority.

## Runtime objects

### AuthorityRequest
A proposed permission. PENDING requests confer no authority. Sources may include a direct user request, an Aureus request, or a derived-pattern proposal. Derived behavior never becomes authority until approved.

### AuthorityGrant
The current bounded permission created only from an approved request. It is revocable and may expire.

### AuthorityCapabilityState
A fast-path suspension for a capability in a Personal or Business scope. Suspension overrides grants.

### AuthorityEvent / AuthorityDecision
Append-only evidence of requests, approvals/denials, grants, revocations, suspension/resume, and gateway decisions. Do not store raw conversation content or secrets.

## Capabilities

Initial generalized classes:

- `SEE`
- `LISTEN`
- `READ`
- `WRITE`
- `SHARE`
- `ACT`

Initial resource classes:

- `MICROPHONE`
- `SCREEN`
- `CONVERSATION`
- `CONNECTED_ACCOUNT`
- `CALENDAR`
- `EMAIL`
- `FILES`
- `BUSINESS_DATA`
- `OTHER`

These are authority primitives, not product modules.

## Approval rules

### Personal context
Only the person may approve authority over their Personal context.

### Business context — human/private resources
For `MICROPHONE`, `SCREEN`, or a person’s private `CONVERSATION`, only the affected person may approve. Organization OWNER/ADMIN status does not substitute for the person’s consent.

### Business context — organization resources
For organization-owned resources, Step 2 starts conservatively: the current organization OWNER approves expansion of Aureus authority. Delegated administration can be added later through an explicitly governed rule rather than assumed from a role name.

## Gateway outcomes

- `PERMIT` — exact active grant exists and no hard constraint/suspension denies it.
- `NEEDS_APPROVAL` — no sufficient authority exists; Aureus may ask but may not execute.
- `DENY` — a hard constraint, revocation, suspension, invalid context, tenant boundary, or other prohibition blocks execution.

Every consequential executor is expected to call the gateway outside the model before execution.

## Trust Center UX

The existing `/permissions` surface becomes the user-facing Trust & Permissions home while retaining Connected Accounts/Documents/Activity.

It must show, in plain language:

- what Aureus is asking for;
- why;
- what it would allow;
- who can approve it;
- active permissions;
- one-action revoke;
- capability suspension (“Aureus shouldn’t have done this”);
- explicit restore;
- recent permission/authority history.

No buried fine print is allowed to contradict the visible explanation.

## Required tests

- PENDING request confers no authority.
- Self can approve Personal permission; another user cannot.
- Business OWNER can approve organization-resource permission for their tenant only.
- Business OWNER cannot approve an employee microphone/screen/private-conversation permission.
- Employee can approve/revoke their own microphone/screen permission inside their employer context without granting employer transcript access.
- Private conversation SHARE requires exact conversation resource id and subject approval.
- Cross-tenant request/grant identifiers are not usable.
- Revoke causes next gateway evaluation to stop permitting.
- Suspension overrides an otherwise-active grant immediately.
- Resume does not manufacture authority; it only allows still-active grants to be considered again.
- Expired grants do not permit.
- Derived-pattern requests remain requests until approved.
- Audit/decision records contain identifiers and reasons, not raw secrets/transcripts.
- Trust Center can approve/deny/revoke/suspend/resume and renders plain-language states.

## Stop condition

When this slice is green and independently reviewed, STOP. Do not begin Responsibilities or any later business domain.