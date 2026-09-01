Aureus Product Architecture Map

Document 1 — Core Product Architecture

Version: 1.0
Status: Canonical

---

Purpose

This document defines the highest-level architectural structure of the Aureus platform.

Its purpose is to establish the major product systems before any features, user interfaces, workflows, or technical implementation are designed.

Every future product decision must fit within this architecture or justify a change to it.

---

Architectural Principles

Every system within Aureus shall:

- Have one clear primary responsibility.
- Avoid duplicating responsibilities owned by another system.
- Be designed to work independently while integrating seamlessly with the rest of the platform.
- Support Version 1 while remaining extensible for future versions.
- Strengthen the member's ability to make meaningful progress.

Every proposed feature must answer the following questions before becoming part of the product:

1. Which core system owns this feature?
2. Does it strengthen that system without duplicating another?
3. Does it help members make meaningful progress?
4. Can it be simplified?
5. Should it exist in Version 1?

---

Core Product Systems

1. Member Core

The Member Core is the center of the Aureus platform.

It manages:

- Member identity
- Profiles
- Goals
- Preferences
- Personal progress
- Dashboard experience

Primary Responsibility: Maintain each member's personal experience and serve as the foundation for every other platform system.

---

2. Opportunity Engine

The Opportunity Engine discovers, organizes, evaluates, and presents legitimate opportunities that may help members improve their lives.

Examples include:

- Financial opportunities
- Career opportunities
- Education
- Housing
- Grants
- Benefits
- Business opportunities
- Community opportunities

Primary Responsibility: Help members discover their best next opportunities.

---

3. AI Intelligence Engine

The AI Intelligence Engine provides reasoning and guidance throughout the platform.

It helps members:

- Understand options
- Compare alternatives
- Build plans
- Receive personalized recommendations
- Navigate complex decisions

Primary Responsibility: Transform information into actionable guidance.

---

4. Journey Engine

The Journey Engine manages long-term progress.

It includes:

- Goals
- Milestones
- Action plans
- Habits
- Progress tracking
- Reviews

Primary Responsibility: Help members consistently move toward meaningful outcomes.

---

5. Pods

Pods are small communities organized around shared goals, interests, professions, or life stages.

Pods support:

- Accountability
- Collaboration
- Peer learning
- Encouragement
- Community

Primary Responsibility: Help members grow together.

---

6. Academy

The Academy is Aureus' learning ecosystem.

It includes:

- Courses
- Learning paths
- Practical exercises
- Skill development
- AI tutoring
- Certifications

Primary Responsibility: Equip members with the knowledge and skills required to reach their goals.

---

7. Business Portal

The Business Portal enables organizations to participate within the Aureus ecosystem.

Capabilities include:

- Organization profiles
- Opportunity publishing
- Recruiting
- Partnerships
- Member engagement

Primary Responsibility: Connect organizations and members through mutually beneficial opportunities.

---

8. Stewardship System

The Stewardship System supports trusted human guidance throughout the platform.

It includes:

- Steward roles
- Community support
- Escalations
- Quality assurance
- Member assistance

Primary Responsibility: Preserve trust, accountability, and human stewardship where it adds value.

---

9. Knowledge System

The Knowledge System serves as Aureus' institutional memory.

It manages:

- Articles
- Guides
- Best practices
- Policies
- Verified knowledge
- Reference materials

Primary Responsibility: Preserve, organize, and continuously improve institutional knowledge.

---

10. Resource Directory

The Resource Directory maintains trusted external resources.

Examples include:

- Community organizations
- Government programs
- Service providers
- Professionals
- Nonprofits
- Assistance programs

Primary Responsibility: Help members quickly find reliable external resources.

---

11. Communication System

The Communication System manages information exchange across the platform.

It includes:

- Notifications
- Messages
- Announcements
- Reminders
- Updates

Primary Responsibility: Deliver timely, relevant communication to members and organizations.

---

12. Administration & Operations

Administration & Operations supports the management of the Aureus platform.

Responsibilities include:

- Platform administration
- Permissions
- Moderation
- Analytics
- Configuration
- Operational oversight

Primary Responsibility: Ensure the platform remains secure, reliable, measurable, and continuously improving.

---

Architectural Rule

Every implementation capability must have one clear primary owning boundary so persistence, policy, and maintenance responsibilities do not become ambiguous.

A higher-level Responsibility may intentionally compose multiple capabilities/systems to achieve one outcome. PA-021 therefore supersedes the earlier interpretation that every user-facing feature or outcome must live inside exactly one product module.

The rule is now:

> one clear owner for each capability; composition across capabilities for the outcome.

This preserves implementation accountability without forcing the user to navigate Aureus as a collection of modules.

---

Conclusion

The Aureus Product Architecture Map establishes the foundational structure of the platform. It serves as the canonical framework upon which all future product architecture, user journeys, features, AI engines, and implementation plans will be built.

No feature should be designed outside of this architectural framework without an intentional revision to this document.

---

End of Document

---

Candidate Reconciliation Note — PA-021 / PA-022

The Founder-approved outcome architecture staged in PR #107 adds a higher-level composition layer above the twelve capability systems listed in this document.

When PA-021/PA-022 are governed and merged:

- **Responsibility**, not a module, becomes the primary cross-domain work object;
- one public Aureus composes the necessary capability systems behind the conversation;
- Principal, Responsibility Passport, Authority/Policy Gateway, Context Firewall, Execution Assurance, Responsible Continuation, and evidence-gated completion govern work across those systems;
- the Outcome Surface brings relevant work to the person instead of making the person operate modules;
- the Private Steward / Visual Flourishing experience becomes the member-facing composition standard.

The twelve systems remain useful capability ownership boundaries unless separately revised. This note prevents PA-001's older module-first wording from being read as a requirement to undo PA-021's outcome-first composition.
