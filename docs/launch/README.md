# Launch Command Center

This folder is the implementation command center for the Aureus First Members launch. It exists so that anyone — Founder, steward, or engineer — can open one place and know exactly where the launch stands, what's next, and what's blocking it, without reconstructing that picture from scattered conversations.

## The three documents

- **`LAUNCH-001-First-Members.md`** — the authoritative launch blueprint. Founder-approved. This document is never rewritten or reorganized by implementation work; it is read, not edited. Every work order and every scoreboard entry in this folder traces back to something this document actually says.
- **`WORKORDERS.md`** — every Gate from LAUNCH-001 (A through F) broken into the smallest independently completable engineering and stewardship tasks, each with an ID, description, dependencies, owner, priority, status, and acceptance criteria. This is where "what needs to happen" lives.
- **`SCOREBOARD.md`** — the living dashboard: overall progress, current gate, current focus, blocked items, what completed this week, and the single next recommended task. This is where "where do we stand right now" lives, and it is updated every time a work order's status changes.

## How this folder is meant to be used

Read `LAUNCH-001` first, always — it is the source of truth for what the launch actually is and why. Then check `SCOREBOARD.md` for the current state. Then find the relevant task in `WORKORDERS.md`. Do not start work on any task whose listed dependencies aren't yet marked complete.

For the formal precedence rule (including a fourth document, `docs/releases/version-1-readiness.md`, and what to do if two documents disagree), see `EXECUTION-AUTHORITY.md` in this folder.

## What this folder is not

It is not a place to introduce new launch strategy. Every Gate, scope boundary, and staffing decision in `WORKORDERS.md` and `SCOREBOARD.md` is derived from `LAUNCH-001` — nothing here invents a new cut, a new ship/no-ship call, or a new gate. If something in the launch needs to change, that change belongs in a revision to `LAUNCH-001` itself, brought to the Founder for approval, not a quiet addition to a work order.
