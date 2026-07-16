FPB-005 — Component Library Specification

Status: Production Blueprint
Version: 1.0
Authority: Frontend Component Standard

---

1. Purpose

This document defines the reusable component library for the Aureus frontend.

Every interface shall be composed from standardized components that express the institutional values of trust, clarity, dignity, accessibility, and stewardship.

New components should be introduced only when an existing component cannot satisfy the need.

---

2. Design Philosophy

Components exist to support understanding and action.

They shall be:

- Consistent
- Accessible
- Predictable
- Reusable
- Conversation-aware
- Responsive
- Calm

Every component should reduce cognitive load rather than increase it.

---

3. Foundational Components

The foundational component library includes:

Conversation

- Conversation Surface
- Member Message
- Steward Message
- Reflection Block
- Thinking Indicator
- Voice Interaction Panel
- Conversation Timeline

Navigation

- Navigation Shell
- Context Bar
- Breadcrumb
- Search
- Quick Actions
- Return to Conversation

Actions

- Primary Button
- Secondary Button
- Approval Button
- Cancel Button
- Save Draft
- Continue
- Review & Approve

Information

- Opportunity Card
- Journey Card
- Resource Card
- Knowledge Card
- Progress Card
- Summary Card
- Recommendation Card

Data Presentation

- Comparison Table
- Timeline
- Checklist
- Progress Indicator
- Status Badge
- Chart Container
- Document Viewer
- Media Viewer

Forms

- Smart Input
- Date Picker
- Address Picker
- File Upload
- Review Screen
- Approval Panel
- Permission Request
- Connected Account Card

Feedback

- Success Confirmation
- Warning
- Error
- Information
- Loading State
- Empty State

---

4. Component Behavior

Every component shall define:

- Purpose
- Inputs
- Outputs
- States
- Accessibility requirements
- Keyboard behavior
- Voice behavior
- Responsive behavior
- Animation behavior

Behavior shall remain consistent throughout Aureus.

---

5. Conversation Awareness

Components shall understand conversational context.

For example:

- An Opportunity Card may be opened directly from conversation.
- A Document Viewer may appear while Aureus explains a form.
- A Timeline may expand during discussion of progress.

The conversation remains active while components are displayed.

---

6. Approval Components

Meaningful actions shall use standardized approval components.

Approval panels shall clearly communicate:

- What is about to happen.
- Why it matters.
- What the member is authorizing.
- What cannot be undone, if applicable.

Member sovereignty shall always be preserved.

---

7. Accessibility

Every component shall support:

- Keyboard navigation
- Screen readers
- High contrast
- Reduced motion
- Dynamic text sizing
- Clear focus indicators

Accessibility is required for every reusable component.

---

8. Versioning

Components are institutional assets.

Breaking changes shall be documented and reviewed before adoption.

Consistency across the platform takes precedence over convenience.

---

9. Constitutional Test

Before introducing a new component, ask:

- Can an existing component accomplish this?
- Does it strengthen clarity?
- Does it reduce cognitive burden?
- Does it reinforce trust?
- Does it support conversation?

If not, redesign the experience rather than multiplying components.