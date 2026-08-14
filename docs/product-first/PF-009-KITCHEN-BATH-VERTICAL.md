# PF-009 — Kitchen & Bath Vertical Pack

## Governed thesis

The Kitchen & Bath pack specializes the general Business Ward without creating a separate intelligence system. The Ward remains tenant-isolated, grounds business claims only in current approved tenant knowledge, and uses the existing consented human handoff.

The purpose of the pack is to help a remodeler answer ordinary pre-sale questions accurately, collect useful visitor-supplied project context, and hand an interested visitor to a person without pretending that the Ward can estimate, contract, schedule, permit, finance, or otherwise commit for the business.

## Publication boundary

Installing the pack creates tenant knowledge records only as `DRAFT`. Templates are not business facts and cannot ground the public Ward until an authorized tenant representative edits them, submits them for review, and approves them under the existing business-knowledge workflow.

The public structured remodel intake is available only when at least one `PF009_KITCHEN_BATH:` record is current, reviewed, and `APPROVED`. A tenant with only draft, rejected, archived, stale, or absent pack records does not expose the specialized intake.

## Intake contract

The specialized handoff can collect project type, rooms, desired scope, project location, desired timing, ownership/decision status, optional budget range, design help needed, preferred contact, and optional photo/file references. The values are transparent visitor-supplied context. They are not a hidden score and are never inferred from demographic or conversational proxies.

Budget is optional. The interface must not require it merely because the vertical commonly discusses project cost.

## Estimation boundary

The Ward must never fabricate a project quote, allowance, schedule, permit requirement, or scope commitment. Cost or timing claims must be grounded in current business-approved knowledge. If approved knowledge is insufficient, the Ward says it does not know and offers the human contact/handoff path.

The core Ward prompt already prohibits booking, buying, submitting, promising, quoting a price, determining eligibility, or contacting anyone. PF-009 preserves that stronger platform boundary rather than weakening it for the vertical.

## Files and retention

PF-009 accepts only bounded metadata for optional project files plus an opaque `storageRef`, following Aureus's existing storage-abstraction pattern. The API does not fetch arbitrary visitor URLs and does not pretend that local browser bytes were uploaded. The production storage adapter is an explicit deployment dependency.

Attachment references live inside the retained handoff qualification envelope. They therefore inherit the same tenant boundary and 90-day deletion lifecycle as the lead and its attributed Ward conversation. Deleting the handoff deletes the retained project intake with it.

## Scheduling and human handoff

The Ward may explain the business-approved consultation or scheduling process. It may not invent availability or claim that an appointment is booked. Until a live scheduling integration confirms an appointment, the correct action is the consented human handoff and an accurate statement that the business team can follow up.

## Success condition

PF-009 is successful when a remodeler can install and review a draft vertical pack, publish only reviewed facts, let a visitor have an ordinary grounded Ward conversation, collect structured remodel context under consent, and receive that context in the existing tenant lead pipeline without any fabricated estimate or cross-tenant data path.
