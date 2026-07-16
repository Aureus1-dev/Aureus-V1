FPB-002 — Screen Architecture

Status: Production Blueprint
Version: 1.0
Authority: Frontend Structural Architecture

---

1. Purpose

This document defines the complete structural architecture of the Aureus frontend.

It specifies every major experience surface, how members navigate between them, and how the AI steward orchestrates those transitions.

Conversation remains the primary interface.

Screens exist to support conversation.

---

2. Design Philosophy

Members should not learn the application.

The application should learn the member.

Navigation is driven primarily by conversation and intent rather than menus.

Whenever practical, Aureus brings the correct interface to the member automatically.

---

3. Primary Experience Surfaces

The Aureus frontend consists of the following primary surfaces:

- Welcome
- Conversation
- Home
- Journey
- Opportunities
- Academy
- Community
- Pods
- Steward
- Documents
- Tasks
- Calendar
- Notifications
- Messages
- Resources
- Profile
- Settings
- Permissions & Connected Accounts
- Search
- Help & Support

Each surface shall support both conversational entry and direct navigation.

---

4. Conversation as the Navigation Layer

Conversation is capable of opening any experience surface.

Examples include:

- "Show me my journey."
- "Open my opportunities."
- "Take me back to what we were doing yesterday."
- "Compare these options."

The AI steward shall determine the appropriate destination and transition the interface accordingly.

---

5. Dynamic Presentation

Visual elements appear only when they improve understanding or enable action.

Supported presentations include:

- comparison views,
- timelines,
- progress dashboards,
- educational modules,
- maps,
- documents,
- forms,
- charts,
- summaries,
- review screens.

Conversation remains active while visual content is displayed.

---

6. Navigation Principles

Navigation shall be:

- predictable,
- reversible,
- conversational,
- accessible,
- and calm.

Members shall never become lost within the interface.

At every point, members should understand:

- where they are,
- why they are there,
- and how to return.

---

7. Context Preservation

The frontend shall preserve conversational context across screens.

Moving between experiences shall not interrupt the member's train of thought.

When appropriate, Aureus shall restore members directly to unfinished work.

---

8. Progressive Disclosure

Only the information necessary for the current task should be presented.

Additional complexity appears gradually as members request it or as it becomes relevant.

---

9. Screen Independence

Each primary surface shall function as an independent module.

Shared components, layouts, and conversation behaviors shall remain consistent across all surfaces.

---

10. Constitutional Test

Every screen shall answer:

- Why does this exist?
- Does it strengthen the member?
- Could this interaction occur more naturally through conversation?
- Does this reduce friction while preserving member sovereignty?

If the answer is no, the screen shall be redesigned or removed.