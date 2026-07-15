# ENG-002 — Canonical Domain Roadmap

**Document ID:** ENG-002
**Title:** Canonical Domain Roadmap
**Status:** Draft for Founder Approval
**Authority:** Canonical upon Founder Approval
**Version:** 1.0

---

# 1. Purpose

This document establishes the official implementation sequence for Aureus Version 1.

Every AI engineering system shall use this roadmap to determine what business domain shall be implemented next.

The roadmap exists to eliminate duplicate work, prevent architectural drift, reduce implementation uncertainty, and maximize engineering efficiency.

Implementation shall proceed domain-by-domain rather than feature-by-feature.

---

# 2. Roadmap Principles

The roadmap shall:

- Build Aureus in logical business capabilities.
- Minimize duplicate implementation.
- Maximize reuse of existing systems.
- Respect architectural dependencies.
- Preserve production quality.
- Produce independently deployable business domains.
- Allow future domains to extend rather than replace previous work.

---

# 3. Domain Completion Rule

A domain shall not be considered complete until all required capabilities for that domain satisfy the Definition of Production Ready (ENG-006).

No new domain shall begin until the current domain has completed:

- Implementation
- Testing
- Documentation
- Operational Verification
- Pull Request Review
- Merge into the canonical main branch

---

# 4. Canonical Domain Sequence

## Domain 001 — Platform Foundation
Status: Complete

Includes:

- Repository architecture
- Platform infrastructure
- Configuration
- Logging
- Audit
- Health
- Bootstrap
- Security foundation

---

## Domain 002 — Authentication & Authorization
Status: Complete

Includes:

- Registration
- Login
- JWT Authentication
- Refresh Tokens
- Password Reset
- Email Verification
- Roles
- Permissions
- Guards

---

## Domain 003 — Journey System
Status: Complete

Includes:

- Goals
- Journeys
- Milestones
- Tasks
- Progress tracking

---

## Domain 004 — Opportunity Intelligence
Status: Complete

Includes:

- Opportunities
- Categories
- Search
- Filtering
- Verification
- Recommendations foundation
- Saved Opportunities

---

## Domain 005 — Resource Directory
Status: Complete

Includes:

- Organizations
- Community resources
- Verification
- Steward moderation
- Search
- Saved Resources

---

## Domain 006 — Member Intelligence
Status: Planned

Includes:

- Member Profile
- Interests
- Skills
- Preferences
- Personal dashboard
- Saved content
- Progress summary
- Personalization foundation

---

## Domain 007 — Organization Intelligence
Status: Planned

Includes:

- Organization management
- Representatives
- Verification
- Organization dashboard
- Resource ownership
- Opportunity ownership

---

## Domain 008 — Pods
Status: Planned

Includes:

- Small groups
- Membership
- Steward assignment
- Group activity
- Collaboration

---

## Domain 009 — Academy
Status: Planned

Includes:

- Courses
- Lessons
- Progress
- Certifications
- Learning paths

---

## Domain 010 — AI Steward
Status: Planned

Includes:

- AI Gateway
- Steward conversations
- Recommendations
- Guidance
- Context management
- Prompt orchestration

---

## Domain 011 — Communications
Status: Planned

Includes:

- Notifications
- Messaging
- Announcements
- Preferences
- Email
- In-app alerts

---

## Domain 012 — Public Experience
Status: Planned

Includes:

- Public website
- Marketing pages
- Landing pages
- Registration
- Authentication UI

---

## Domain 013 — Deployment & Operations
Status: Planned

Includes:

- CI/CD
- Monitoring
- Metrics
- Production configuration
- Backups
- Disaster recovery
- Release preparation

---

# 5. Domain Dependencies

No domain shall duplicate another domain's responsibilities.

Every new domain shall extend previously completed work.

Shared capabilities shall remain centralized.

---

# 6. Roadmap Governance

This roadmap is the official implementation order for Aureus Version 1.

AI engineers shall implement only the approved current domain unless Founder approval authorizes an exception.

---

# 7. Amendment

Only the Founder may reorder domains, add domains, remove domains, or redefine domain scope.

Changes shall preserve architectural integrity and maintain backward compatibility wherever practical.