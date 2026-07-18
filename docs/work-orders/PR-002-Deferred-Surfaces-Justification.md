# PR-002 — Deferred Frontend Surfaces: Community, Calendar, Settings, Search, Help

**Status:** Explicitly deferred, not resolved. This document exists to satisfy PR-002's acceptance criterion that every PR-001 critical finding is "resolved or explicitly deferred with a documented justification" — these five are the deferred half of that split.

## Why these five and not the other six

PR-002 named 11 placeholder frontend surfaces. Six of them (Notifications, Profile, Tasks, Pods, Resources, Messages) had a real backend already built and simply never connected — wiring them was a frontend-only exercise plus one narrow, justified backend extension (Tasks' self-scoped "list my tasks across every milestone" case). Those six are done as of this work order.

These five do not have that backend to connect to. Each was independently verified (read-only repository search, no assumptions) before writing this document:

| Surface | Closest existing backend concept | Verdict |
|---|---|---|
| **Community** | Pods domain (`apps/api/src/pods/`) — but `PodType` is only `HOME \| INTEREST`, no general-community concept. `Announcement` model (`apps/api/src/communication/announcements/`) is one-way broadcast, not a shared space. | No dedicated backend exists. |
| **Calendar** | `PodEvent`/`PodEventRsvp` models and `apps/api/src/pods/events/`, plus `PodMeetingSchedule` and `apps/api/src/pods/meeting-schedule/` — both scoped to one Pod. | No cross-domain Calendar backend exists; only Pod-scoped event data a Calendar surface would need to aggregate from scratch. |
| **Settings** | Fragments only: `Profile` (`apps/api/src/users/profile/`), `NotificationPreference` (`apps/api/src/communication/preferences/`), and a client-only `PreferencesContext` with no API behind it. | No unified Settings backend exists. |
| **Search** | Per-domain `q` filters already on Opportunities, Resources, and Pods list endpoints (`ListOpportunitiesQueryDto`, `ListResourcesQueryDto`, `ListPodsQueryDto`) — each searches only its own entity. | No cross-domain Search backend/module exists. |
| **Help** | Knowledge System (`KnowledgeArticle`, `apps/api/src/knowledge/`) is the nearest reusable content source, but it is not wired as a help-center concept (no category taxonomy, no support-ticket path). | No dedicated Help/Support backend exists. |

## What "resolved" would actually require

Unlike the six wired surfaces, none of these five can be closed by frontend wiring plus a small, contained backend extension. Each implies a genuinely new backend domain or a cross-cutting aggregation layer:

- **Community** — a real design decision on what "Community" means distinct from Pods (a public feed? a directory? something else), then a schema and moderation model to match.
- **Calendar** — an aggregation layer across Pod events/meeting schedules (and potentially Academy or Stewardship dates), plus a decision on whether it is read-only or supports personal entries.
- **Settings** — a real settings surface composing Profile + NotificationPreferences + (a currently backend-less) PreferencesContext into one coherent page, plus deciding what belongs in "Settings" that isn't already Profile.
- **Search** — either a federated search across existing per-domain endpoints (frontend-only, feasible) or a genuine cross-domain search index (backend work) — this is the one candidate closest to being frontend-only, but was still out of scope for this pass given the other four's backend gaps made a consistent "connect what exists" pass the higher priority.
- **Help** — a decision on whether Help means self-serve Knowledge articles, a support-contact path, or both, before any backend work is justified.

Building any of these now would mean inventing product scope inside a remediation work order, which is a Founder-level decision (WO-030's Founder Review precedent — Pods launched only after an explicit Founder specification review), not something to improvise silently while wiring existing plumbing.

## Recommendation

Treat these five as backlog for a future, explicitly-scoped work order (or four/five separate ones — Community and Settings in particular are large enough to warrant their own Founder specification, similar to WO-030's Pods Founder Review). Do not build partial backends for them under PR-002's banner; PR-002's acceptance criterion is satisfied by this explicit deferral, not by rushing new scope in.

No repository changes were made for this task — verification only.
