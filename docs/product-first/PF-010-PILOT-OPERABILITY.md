# PF-010 — Pilot Offer and Operability

## Pilot offer

Aureus may offer one Kitchen & Bath business a **30-day founding pilot** of the sellable web product defined by PF-004 through PF-009. During the pilot the business receives the business tenant/console, governed knowledge workspace, public Ward, consented lead/handoff, and Kitchen & Bath vertical pack.

Phone/SMS continuity is not represented as part of this pilot; it is PF-011.

After the 30-day pilot there is **one post-pilot plan: Founding Business**. The plan is the single commercial successor to the free pilot; Aureus does not create competing tiers for the first client. The Founder must set and approve the actual monthly price and any contractual commercial terms before an external client is asked to convert. Until that value is approved, the product may be demonstrated and internally tested but must not imply an agreed price.

The pilot itself does not waive the product's trust boundaries: tenant isolation, reviewed knowledge, explicit handoff consent, honest unknown/fallback, retention/deletion, cost stop-lines, and human review remain in force.

## External-client launch gate

A green merge is necessary but not sufficient. The first external business may begin only after PF-012's Founder walkthrough passes on the **same exact three-repository deployment manifest** recorded by the PF-010 acceptance record.

Before PF-012, the operator must also complete the setup, privacy, accessibility, backup/restore, alerting, and incident checks in this work order. Items that require a real production account or human observation are deliberately recorded as manual gates rather than being claimed by CI.

## Tenant setup sequence

1. Deploy the accepted V1 SHA from `render.yaml`; pin the accepted Foundry and Library SHAs in the PF-010 acceptance record.
2. Validate production environment configuration with `pnpm verify:env` before traffic is switched.
3. Confirm `/health/live`, `/health/ready`, and the web root pass on the deployed URLs.
4. Confirm one real registration/email-verification cycle and one real password-reset cycle.
5. Create the business organization and the actual operator membership; complete the business profile, service area, hours, contact routes, and escalation target.
6. Install the Kitchen & Bath pack. Edit all five templates to the business's real facts; submit and approve them through the existing review workflow. Do not publish draft templates.
7. Publish the Ward only after the complete vertical pack is current and approved.
8. Ask realistic questions about services, exclusions, geography, price, scheduling, financing, permits, and unknown information; verify every business-specific answer is grounded or fails honestly.
9. Create a consented Kitchen & Bath handoff; confirm the lead appears in the tenant console with conversation/source evidence and structured intake.
10. Exercise assignment, contact, close/loss reason, correction, export, and deletion.
11. Verify tenant provider/spend summary and the AI emergency-stop/budget configuration.
12. Record the pre-migration backup/restore evidence and the tested production alert route.
13. Complete the manual accessibility review on mobile and desktop.
14. Complete PF-012 against the exact accepted manifest before inviting the first external business.

## Usage and cost accounting

PF-008 already records tenant-scoped `PUBLIC_WARD_CONVERSATION` AI request outcomes, provider/model evidence, spend, latency, and request counts. PF-010 treats this ledger as the pilot accounting source rather than creating a second billing meter. The business operations console must show the observed tenant activity; `NO_TRAFFIC` is a valid state and must never be represented as provider uptime.

Platform stop-lines remain `AI_GLOBAL_DAILY_BUDGET_USD`, `AI_USER_DAILY_BUDGET_USD`, and `AI_EMERGENCY_STOP`. A pilot operator must know how to stop AI before an external client is enabled.

## Truthful operability status

Automated and repository-backed now:

- CI product-contract validation, dependency audit, types, lint, migrations, API/web tests, production build;
- Docker API/web builds, migration from the built API image, API liveness/readiness;
- Render deployment blueprint with auto-deploy off;
- database backup wrapper and migration status verification;
- tenant-scoped provider/spend accounting;
- explicit health endpoints, retention/deletion, tenant boundaries, and safe export.

Manual/environment-dependent before external pilot:

- real Render environment values and deployed URLs;
- real SMTP delivery;
- production alert destination (for example a configured `SENTRY_DSN`) and alert receipt test;
- restore drill evidence against a non-production database;
- processor/vendor values in the pilot privacy disclosure;
- manual accessibility review;
- final commercial price/terms for Founding Business;
- PF-012 Founder walkthrough.

No document or CI result may convert one of these manual gates into a claimed completed fact without evidence.
