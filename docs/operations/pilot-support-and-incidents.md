# Pilot Support and Incident Flow

This runbook governs the first Business V1 pilot. It supplements `production-runbook.md`; it does not replace the technical recovery procedures there.

## Support intake

Every pilot report is recorded with: tenant, reporter/contact route, time observed, affected surface, exact URL/action, expected result, actual result, deployment SHA, and whether personal/business data may be involved. Do not ask a visitor to send secrets, passwords, access tokens, or raw production database content.

## Severity

- **SEV-1 — trust/safety boundary:** suspected cross-tenant disclosure, unauthorized access, consent/deletion failure, material secret exposure, or the Ward making consequential commitments outside its authority. Disable the affected public surface immediately; set `AI_EMERGENCY_STOP=true` if AI output may continue the harm; preserve logs/evidence; do not resume until the boundary is understood and verified.
- **SEV-2 — pilot unavailable/degraded:** published Ward unavailable, persistent provider failure, handoffs not retained/notified, production database/readiness failure, or material cost-control failure. Stop new pilot traffic where needed, use human contact fallback, diagnose against the exact deployed SHA, and restore before resuming.
- **SEV-3 — functional defect:** a tenant-scoped feature is wrong but the core trust boundary and fallback still work. Record, reproduce, patch through normal exact-SHA CI, then deploy deliberately.
- **SEV-4 — cosmetic/documentation:** no material functional or trust impact. Queue without bypassing release gates.

## First response

1. Identify the exact deployment SHA and tenant before changing anything.
2. Check `/health/live`, `/health/ready`, web health, provider/spend observations, recent application logs, and the tenant's publication/knowledge state.
3. If tenant isolation or consent is in doubt, treat as SEV-1 even if impact is not yet proven.
4. Prefer disabling the smallest unsafe surface: unpublish the business Ward or stop AI globally if necessary. Never solve an incident by weakening tenant guards, consent, retention, review, or grounding.
5. Keep the business informed through the configured human support route; do not have the Ward invent incident status.

## Provider outage

When AI completion fails, the public Ward already uses an honest human-contact fallback. Confirm that behavior rather than looping retries. If failures are sustained, suspend the public Ward or enable the AI emergency stop and route inquiries to the business's configured human contact. `NO_TRAFFIC` is not proof of provider health.

## Suspected data leakage

Immediately stop the affected public surface, preserve identifiers and logs without distributing the exposed data further, identify all potentially affected tenants, and verify the exact query/authorization path before restoration. A fix requires adversarial tenant-deny tests and the complete CI/Docker gate. External notification/legal obligations are jurisdiction- and incident-specific and require qualified review; this runbook does not invent them.

## Recovery and closure

A production fix is released only through a reviewed exact SHA with green CI/Docker evidence. Verify the deployed SHA after rollout, repeat the failing user flow, confirm health and tenant boundaries, then record what happened, impact, cause, containment, correction, verification, and any prevention work. If a database change is involved, follow the backup/restore/rollback procedures rather than deleting or manually rewriting production evidence ad hoc.
