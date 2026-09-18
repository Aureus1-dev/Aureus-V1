# PEOPLE-AUTH-001 — Personal Authority, Consent & Privacy

**Parent:** GitHub Issue #134  
**Program:** #122 — PEOPLE-000 Step 2  
**Base:** `5830f511b16c62fdfd3bae24dd22ecb02a08fac8`  
**Frozen experience contract:** PEOPLE-EXP-001, merged via PR #133  
**Shared primitive inherited:** `AUREUS-BUSINESS-STEP2-AUTHORITY-CONSENT-TRUST.md`

## Single job

Complete the People-specific authority/privacy experience by extending the existing generalized Authority layer. Do not create a People-only consent engine, second permission ledger, second case system, or generalized workflow system.

## Invariants

1. Help/guidance may begin without runtime action authority.
2. A permission request confers no authority.
3. Personal authority is self-approved.
4. Runtime authority is distinct from arrival `ConsentRecord`.
5. Authority is specific to context, capability, exact resource where required, purpose, recipient/data scope for sharing, policy version, and optional expiry.
6. Revocation/suspension affects the next gateway decision.
7. A model may propose a request but never grant itself authority.
8. Private conversations, documents, and connected accounts remain private by default.
9. Sharing is recipient-and-purpose bounded and uses the minimum explicit data field set.
10. Declining or revoking authority changes the route; it does not lower member standing or close a Responsibility.
11. Authority/audit records contain metadata only, never raw document contents, conversation contents, credentials, or secret values.

## Smallest complete runtime slice

### Exact resource scope
- Add `DOCUMENT` as an Authority resource class.
- For Personal `DOCUMENT` and `CONNECTED_ACCOUNT` authority involving READ/WRITE/SHARE/ACT, require an exact owned resource reference.
- Existing exact conversation ownership remains enforced.

### Recipient + minimum-data share scope
Every `SHARE` request/evaluation must include:
- one explicit recipient kind;
- one explicit recipient reference;
- one or more canonical data-field names;
- exact purpose.

The gateway must require the exact same canonical share scope as the approved grant. A grant for one recipient or packet cannot be replayed for another recipient or broader/different field set.

This slice rejects wildcard/bulk markers such as `*`, `ALL`, `FULL_HISTORY`, `FULL_TRANSCRIPT`, and `ENTIRE_CONVERSATION`. If a future domain genuinely needs raw/full export, it requires a separate governed capability rather than silently broadening this one.

### Decline/revocation continuation
The member-facing Trust & Permissions experience must make clear:
- “Not now” means Aureus will not take that authority;
- work/guidance can continue where a responsible lower-authority route exists;
- taking permission back is immediate;
- restoring a suspended capability never recreates a revoked grant.

## Member-visible experience

Trust & Permissions must show in plain language:
- what Aureus is asking to do;
- exact resource when present;
- exact recipient and data fields for sharing;
- why/purpose;
- expiry where present;
- Allow / Not now;
- active authority and one-action revoke;
- suspension and explicit restore;
- recent authority history;
- a clear continuation statement after denial/revocation.

No raw private content or secrets appear in the authority ledger or Trust Center.

## Required deny-path proof

- pending request does not permit;
- Personal permission cannot be approved/revoked by another user;
- missing/wrong-owned Document ref is rejected;
- connected account exact-ref ownership remains enforced;
- SHARE without recipient is rejected;
- SHARE without explicit field scope is rejected;
- wildcard/full-history/full-transcript markers are rejected;
- exact share grant does not permit another recipient;
- exact share grant does not permit a broader/different field set;
- denied request does not permit;
- revoked permission immediately stops permitting;
- suspension overrides an otherwise-valid exact grant;
- private conversation SHARE still requires exact conversation ref;
- trust snapshot exposes metadata only and no raw content/secrets.

## Non-goals

- Household/delegated legal representative authority — Step 3/later governed model.
- New provider CRM or staff case dashboard.
- New document store.
- New memory-retention system.
- Full transcript/history export capability.
- New consequential executors; this slice strengthens the shared gateway they must call.

## Definition of done

At one exact head SHA:
1. work order + implementation trace cleanly to #134 and frozen PEOPLE-EXP-001;
2. schema/migration, API gateway, E2E deny paths, and Trust Center UI/tests are complete;
3. Build & Test green;
4. Docker Build Verification green;
5. independent adversarial review of the complete diff;
6. every BLOCKER/HIGH repaired and re-reviewed;
7. Founder explicitly authorizes merge.
