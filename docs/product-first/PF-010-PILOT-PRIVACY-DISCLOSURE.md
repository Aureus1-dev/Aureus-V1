# PF-010 — Pilot Data Processing and Privacy Disclosure Inventory

This is a product disclosure inventory for the pilot, not jurisdiction-specific legal advice or a substitute for a reviewed privacy policy/data-processing agreement.

## What the Business V1 pilot processes

### Business tenant data

Business identity/profile, memberships/roles, service area, business hours, contact routes, escalation target, tenant-owned knowledge and provenance, review state, operational lead records, outcome state, audit context, and tenant-scoped AI usage/cost observations.

### Visitor/Ward data

Guest Ward conversation content and attributed grounded-source evidence. The public Ward does not require an Aureus account.

### Consented handoff data

When the visitor affirmatively creates a handoff: name, chosen contact method/value, project summary/location/timing, the attributed Ward conversation, and—when the approved Kitchen & Bath pack is active—visitor-supplied structured remodel context and optional project-file storage references. The current handoff consent is not consent to unrelated marketing.

## Purposes

Data is used to provide the tenant's Ward, answer from approved tenant knowledge, preserve conversation/source attribution, create the requested business handoff, enable the business to accept/contact/close the request, support correction/deletion, operate the service, investigate incidents, and account for provider usage/cost. It must not be repurposed into hidden qualification/persuasion or cross-tenant profiling.

## Retention and deletion

- Ordinary public Ward conversations use the runtime conversation retention configured by the application and expire automatically.
- A consented lead/handoff and its retained project intake use the existing 90-day handoff retention boundary unless deleted sooner.
- Optional project-file references in PF-009 live inside that retained handoff envelope; a deployment storage adapter must enforce equivalent byte/object deletion if actual file storage is enabled.
- Tenant knowledge and business operational records follow their product lifecycle and correction/archive rules rather than the short guest-conversation lifecycle.

The exact production policy presented to users must accurately reflect any provider-specific backup retention or legally required retention that cannot be deleted immediately; PF-010 does not invent those facts.

## AI and service providers

The application supports configured AI providers and infrastructure services. The deployment manifest currently selects OpenAI for the V1 API configuration, but the operator must record the **actual production processors/subprocessors and hosting/monitoring/storage providers in use** before an external pilot. Repository support for `SENTRY_DSN`, SMTP, Redis, or a storage reference does not prove that a particular vendor is configured.

No external-facing disclosure may name a processor based only on an example/default when the actual production account has not been verified.

## Access and separation

Organization-scoped business routes require actual membership in the requested BUSINESS tenant. Global platform roles do not automatically become a tenant credential for the PF-008 protected operations/knowledge/lead surfaces. Public Ward retrieval and lead persistence are pinned to the published tenant. Export is bounded and excludes secret-bearing fields identified by PF-008.

## User-facing truth requirements

Before the first external pilot, reviewed public-facing terms/privacy copy must state, in plain language:

1. that the Ward is AI-assisted and is not a human;
2. what visitor data is processed for an ordinary Ward conversation;
3. what additional data is shared when the visitor affirmatively creates a handoff;
4. the applicable handoff retention/deletion promise;
5. how a visitor/business can request deletion or correction where applicable;
6. the actual categories of service providers/processors involved;
7. that the Ward can be wrong/incomplete and cannot make commitments for the business;
8. contact information for privacy/support questions.

## Pilot gate

The Founder/operator must review the actual deployed vendor list and obtain qualified legal/privacy review appropriate to the pilot geography before treating this inventory as final external legal text. The software and CI can verify retention/authorization mechanics; they cannot certify legal sufficiency for a specific deployment or jurisdiction.
