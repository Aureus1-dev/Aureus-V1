# Business Pilot Accessibility Review

PF-010 requires an accessibility review, not an unsupported claim of formal conformance. Automated tests/builds are evidence of software correctness; they are not a WCAG certification.

## Surfaces in scope

Review the public Ward and Kitchen & Bath intake on current Android/iOS-class mobile viewport and desktop, plus the authenticated business onboarding, knowledge workspace, and operations console needed for the pilot.

## Manual checks

- Complete every pilot-critical flow using keyboard only: visible focus, logical order, no keyboard trap, controls reachable and operable.
- Verify labels/instructions for text fields, selects, checkboxes, buttons, errors, consent, and optional/required fields.
- Verify headings and landmarks preserve a sensible reading structure.
- Verify status/error changes are perceivable without relying only on color; important asynchronous errors/status use appropriate live semantics where implemented.
- At 200% browser zoom and a narrow mobile viewport, verify content reflows without hiding pilot-critical controls or requiring two-dimensional scrolling for ordinary text/forms.
- Verify text/control contrast with an accessibility inspection tool; record any exception rather than guessing a ratio from visual appearance.
- With a screen reader, complete: start Ward conversation, read source attribution, submit a message, understand an honest fallback, review handoff consent, submit Kitchen & Bath intake, and confirm success/error state.
- Verify touch targets and form spacing are practically usable on a phone.
- Verify motion/animation, if present on a pilot-critical route, does not prevent use when reduced-motion preference is enabled.
- Verify copy identifies the Ward as AI-assisted/not a human and that consent can be understood before action.

## Evidence record

For each device/browser/assistive technology tested, record date, exact deployed V1 SHA, viewport/device, browser, assistive technology, flow, pass/fail, defect link, and retest evidence. A failure in a pilot-critical flow blocks PF-012 acceptance until fixed or the affected feature is removed from pilot scope.

## Minimum PF-012 accessibility gate

The Founder walkthrough must be independently usable on mobile and desktop without relying on an inaccessible alternate operator path. The exact deployed SHA used for the review must match the PF-010/PF-012 manifest. If the SHA changes, retest the materially affected surfaces.
