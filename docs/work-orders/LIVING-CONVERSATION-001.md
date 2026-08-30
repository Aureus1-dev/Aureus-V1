# LIVING-CONVERSATION-001 — Hall living conversation stage

Status: implementation candidate
Parent: Founder walkthrough / member Hall experience
Base: 68232e91485d8b8a802712afc301e2d24515ff1b
Branch: feat/living-conversation-stage

## Product outcome

The Hall must feel like a person and their Steward are working together in one room, not like a conventional customer-service chat application.

Conversation is transient in the foreground. Useful work is durable in the foreground. The full transcript remains durable but moves behind an explicit History control.

## Scope

### Live conversation
- Show only the current member/Steward exchange as large caption-like text.
- When the member begins a new turn, the prior exchange leaves the live foreground.
- Do not delete or rewrite historical messages.
- Type and Talk use the same caption language.
- Respect reduced-motion preferences.

### History
- History is closed by default.
- One History control opens the existing saved conversation list plus the complete current transcript.
- Starting/selecting conversations continues to use the existing ConversationContext mechanisms.
- No second persistence system is introduced.

### Visible work
- Pending text requests may show only a neutral, truthful working state.
- Do not fabricate intermediate searching, checking, verifying, or contacting states: the current HTTP request does not stream backend sub-steps.
- Real structured outputs remain visible as work products: server-verified Opportunity action, coordinated plan, Journey update, document, and the existing application-guidance panel.
- Ephemeral interface tool receipts may be shown only from the fixed backend allow-list and with server-owned copy. Never render raw tool arguments.

### Steward conversational behavior
- Understand before presenting a menu.
- Ask at most one necessary question at a time.
- Briefly explain why a requested answer is needed when the reason is not obvious.
- Lead with the strongest grounded path once enough is understood.
- Never claim work happened unless a real result/action is available.
- Never expose or simulate private chain-of-thought.

## Hard boundaries

This work order does not:
- change message persistence or conversation ownership;
- add a new database table or migration;
- add SSE/WebSocket/streaming infrastructure;
- broaden AI tool authority;
- add browser/computer control;
- alter Opportunity verification;
- alter See → Guide consent/privacy;
- change deployment or production configuration.

## Acceptance

Automated:
- latest live text exchange replaces old foreground dialogue;
- pending state removes the prior exchange and shows an honest working status;
- full transcript is reachable through History;
- verified Opportunity remains visible as durable work after its prose caption ages out;
- raw/unknown tool arguments never render;
- plans/Journey/documents remain actionable through their existing callbacks;
- voice renders only current captions;
- prompt contract protects one-question/why/truthful-work behavior;
- accessibility checks pass;
- full repository typecheck/lint/API/web/build/Docker CI passes at exact candidate SHA.

Physical acceptance after deployment:
- Android phone: Type, History, keyboard, work stage, Opportunity action, See → Guide.
- Voice: live captions replace rather than stack, audible turn remains canonical.
- Narrow viewport: no controls cover captions or composer.
- Reduced-motion remains usable.
