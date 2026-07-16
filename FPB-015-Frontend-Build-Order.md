FPB-015 — Frontend Build Order

Status: Production Blueprint
Version: 1.0
Authority: Frontend Engineering Execution Plan

---

1. Purpose

This document establishes the canonical implementation order for the Aureus frontend.

Every engineering effort should follow this sequence unless an approved architectural decision explicitly requires a different order.

The objective is disciplined execution with minimal rework.

---

2. Guiding Principle

Build the foundation before the features.

Every layer should support the layers above it.

Conversation remains the organizing principle of the entire frontend.

---

3. Phase One — Foundation

Implement the shared frontend foundation.

This includes:

- Project structure
- Design token system
- Component library
- Layout framework
- Routing architecture
- Accessibility foundation
- Theme system
- State management foundation

No feature development begins until this foundation is operational.

---

4. Phase Two — Conversation Core

Implement the core Aureus experience.

This includes:

- Conversation interface
- AI steward integration
- Voice readiness
- Context preservation
- Conversation history
- Reflection and response flow
- Dynamic screen orchestration

The conversation becomes the primary interface.

---

5. Phase Three — Core Member Journey

Implement the first complete member experience.

Recommended order:

1. Welcome
2. Conversation
3. First Mission
4. Opportunity Discovery
5. Review & Approval
6. Progress Tracking

The first end-to-end experience should be fully usable before expanding into additional features.

---

6. Phase Four — Institutional Experiences

Implement major member-facing capabilities.

Examples include:

- Journey
- Opportunities
- Academy
- Community
- Pods
- Documents
- Messages
- Calendar
- Resources
- Profile
- Settings

Each capability should be completed vertically, including backend integration, accessibility, testing, and recovery.

---

7. Phase Five — Connected Experiences

Implement optional connected services.

Examples include:

- Email
- Calendar synchronization
- Cloud storage
- Future approved integrations

Every integration shall remain permission-based, transparent, and revocable.

---

8. Phase Six — Refinement

Improve:

- Performance
- Accessibility
- Responsiveness
- Motion
- Recovery
- Offline support
- Observability

Refinement continues throughout the life of Aureus.

---

9. Completion Criteria

A feature is considered complete only when it:

- conforms to all governing canons,
- satisfies its production blueprint,
- integrates successfully with backend services,
- passes accessibility requirements,
- passes automated and manual testing,
- preserves member sovereignty,
- and strengthens the member experience.

Partial implementation is not considered complete.

---

10. Change Management

Changes to implementation order shall be documented with rationale.

Architectural shortcuts that compromise institutional quality shall not become permanent.

---

11. Constitutional Test

Before beginning any implementation, ask:

- Is this the next highest-value capability?
- Does it build upon the existing foundation?
- Does it reduce future rework?
- Does it strengthen the member experience?
- Does it preserve architectural integrity?

If not, reconsider the implementation order.