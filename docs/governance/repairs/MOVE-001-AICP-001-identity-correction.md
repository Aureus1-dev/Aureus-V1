# MOVE-001 — AICP-001 Identity/Location Correction

**Date:** 2026-07-21
**Type:** Repository identity correction (pre-approved immediate exception)
**Authority:** Founder Decision, 2026-07-21 ("Immediate Exception")

## What was wrong

The file `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md` was misnamed. Its filename and path implied it was the "Aureus Risk Management Protocol" (ARM-001), but its entire body — all 3,499 lines — is the **Aureus AI Collaboration Protocol**. The document itself opens "AICP-001 / Aureus AI Collaboration Protocol / Document Number: AICP-001" and closes cleanly with "End of Document." The strings "ARM-001" and "Risk Management" do not occur anywhere in the body — only in the filename. There is no lost or hidden Risk Management content; the filename was simply wrong from creation.

This was discovered while reconciling `docs/canon/ai/AICP-002-Constitutional-Stewardship-Audit-Protocol.md`, which explicitly presupposes an existing AICP-001 ("the process by which AICP-001 and all future Artificial Intelligence governance documents are reviewed...").

## Why this qualified as an immediate, pre-approved fix

- Pure identity/location correction — no governing text was modified.
- Zero risk to authority or lineage: the document's own internal Document Number (AICP-001) was never in question, only its filename and folder.
- No file anywhere in the repository referenced the old path (`docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md` or the string `ARM-001`) prior to this move — confirmed via repository-wide search.
- `git mv` was used and Git recognized it as a 100%-similarity rename, so full file history is preserved under the new path.

## What changed

| | Before | After |
|---|---|---|
| Path | `docs/governance/protocols/ARM-001-Aureus-Risk-Management-Protocol.md` | `docs/canon/ai/AICP-001-Aureus-AI-Collaboration-Protocol.md` |
| Filename identifier | ARM-001 | AICP-001 |
| Body content | Unchanged | Unchanged |

Placed alongside `AICP-002-Constitutional-Stewardship-Audit-Protocol.md` in `docs/canon/ai/`, since both belong to the same AICP family and AICP-002 already lives there.

## References checked and updated

Repository-wide search for `ARM-001` and `Aureus-Risk-Management-Protocol` (all `.md`, `.ts`, `.json` files) returned no hits before the move. No references required updating.

## What this does NOT resolve

There is no longer any document named "Aureus Risk Management Protocol" (ARM-001) anywhere in the repository — because there never was one; the name was never attached to real content. Whether Aureus needs a genuine, separate Risk Management Protocol is a distinct, open question for the Master Remediation Plan, not something this move addresses.
