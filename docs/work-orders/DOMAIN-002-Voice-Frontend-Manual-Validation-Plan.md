# DOMAIN-002 — Voice (Frontend Increment): Manual Device Validation Plan

This environment has no audio hardware and no live network path to OpenAI's Realtime API, so nothing below has been executed automatically — everything in this document is a checklist for a human tester on a real device, not a report of results. Automated coverage (unit, integration-shaped, and jsdom-simulated component/E2E tests) is documented separately in the Domain Readiness Report; this plan covers only what automation structurally cannot reach: real microphones, real speakers, real browsers, and a real provider connection.

## 1. Prerequisites

- A deployed environment with `OPENAI_API_KEY` configured (this plan is meaningless against the stub voice provider, which never produces real audio).
- Physical access to: a laptop/desktop with a working microphone and speakers/headphones; an iPhone running Safari; an Android phone running Chrome.
- A screen reader available on at least one platform (VoiceOver on macOS/iOS, or NVDA on Windows).

## 2. Browser / Device Matrix

| Platform | Browser | Priority |
|---|---|---|
| macOS | Chrome | Required |
| macOS | Safari | Required |
| macOS | Firefox | Recommended |
| Windows | Chrome | Required |
| Windows | Edge | Recommended |
| iOS | Safari | Required (WebRTC on iOS Safari has known historical quirks — autoplay restrictions, background-tab audio suspension) |
| Android | Chrome | Required |

## 3. Core Conversation Flow

For each row in the matrix above:

1. Sign in, open a conversation, switch to **Talk** mode. Confirm the `Start voice conversation` button is the *only* thing that has happened so far — no microphone permission prompt should appear before this point.
2. Press **Start voice conversation**. Confirm the browser's native microphone permission prompt appears now, not earlier.
3. Grant permission. Confirm the state visibly moves to "Listening…" within a couple of seconds.
4. Speak a real question aloud ("What is a Journey?"). Confirm:
   - The orb visibly changes state as you speak, then again once the steward begins responding.
   - The steward's voice is audible through speakers/headphones at a normal, non-distorted volume.
   - The live transcript shows your own words appearing, then the steward's reply appearing, both roughly in sync with the audio.
5. Let the steward finish a full reply naturally. Confirm the state returns to "Listening…" afterward, not stuck on "speaking."

## 4. Continuous Conversation (no per-turn button press)

6. After the first exchange, speak again *without* pressing any button. Confirm the steward hears and responds without requiring you to press Start again — this is the core "continuous conversation" requirement, not a press-to-talk walkie-talkie pattern.
7. Have a natural back-and-forth of at least 3 exchanges. Confirm the experience feels like a conversation, not a sequence of disconnected requests.

## 5. Barge-In

8. While the steward is mid-sentence (audibly speaking), start talking over it. Confirm:
   - The steward's audio stops promptly.
   - The state visibly reflects the interruption (returns to listening) without a noticeable stuck/frozen moment.
   - The transcript shows the interrupted steward turn marked as interrupted, not silently truncated as if it were a complete answer.
9. Separately, while the steward is speaking, press the **Interrupt** button instead of talking over it. Confirm the same stop-and-return-to-listening behavior happens from the button alone, with no need to also speak — this is the accessible alternative to voice barge-in and must work standalone.

## 6. Mute

10. Press **Mute** mid-conversation. Confirm the button's label/state changes and that speaking while muted does not produce a transcript entry or a steward response.
11. Press **Unmute**. Confirm speaking resumes working normally afterward.
12. Confirm muting does **not** end the session or require restarting — the conversation should still be live and resumable.

## 7. End Session

13. Press **End conversation**. Confirm a calm confirmation state appears (not an abrupt disappearance), and that pressing **Done** returns to the text conversation view.
14. Confirm the text conversation view now shows the messages that were just spoken by voice, in the correct order relative to any earlier typed messages — this is text ↔ voice continuity, and it must hold on a real backend round-trip, not just in the mocked test suite.
15. Start a **new** voice session on the same conversation. Confirm the steward's reply reflects awareness of what was discussed by voice previously (proof the same canonical conversation is genuinely being extended, not restarted).

## 8. Reconnection / Network Interruption

16. Mid-conversation, briefly disable Wi-Fi/network, then re-enable it within a few seconds. Confirm the UI surfaces a calm, honest error state rather than hanging silently, and that starting a new session afterward works normally (graceful reconnection via session supersession, not a broken permanent state).
17. Open a second browser tab/window signed in as the same member and start a second voice session. Confirm the first session ends gracefully (per the backend's one-active-session-per-member policy) rather than both sessions running simultaneously in a broken state.

## 9. Permission Denied Path

18. On a fresh browser profile (or after revoking microphone permission in browser settings), press **Start voice conversation** and deny the microphone permission prompt. Confirm a calm, actionable error state appears ("Microphone access is needed…") rather than a silent failure or a raw browser error.

## 10. Mobile-Specific Checks

19. On iOS Safari specifically: confirm audio still plays after backgrounding and returning to the tab, and after the screen auto-locks and is unlocked again mid-conversation.
20. On both iOS and Android: confirm all controls (Mute, Interrupt, End conversation, Type/Talk toggle) meet a comfortable touch target size and are reachable with one hand at typical phone widths.
21. Confirm the transcript area scrolls correctly and doesn't overlap the on-screen keyboard if it appears (e.g., when switching back to Type mode).

## 11. Screen Reader Pass

22. Using VoiceOver (macOS or iOS) or NVDA (Windows), navigate to the voice surface without looking at the screen. Confirm:
   - The "Start voice conversation" button is announced clearly and is reachable via normal navigation (not just mouse).
   - State changes ("Listening…", "Your steward is thinking…", "Your steward is speaking…") are announced automatically without requiring the user to manually re-focus anything.
   - Each transcript entry is announced as it's added, distinguishing "You said" from "Your steward said."
   - Mute, Interrupt, and End conversation are all reachable and operable via keyboard/screen-reader gestures alone, with clear accessible names.

## 12. Sign-Off

This plan is considered satisfied only when every numbered item above has been performed on a real device by a human tester, with any failures filed as follow-up issues rather than silently accepted. Until that pass occurs, the Domain Readiness Report will list this as validated-by-design and automated-test-covered, but explicitly **not yet manually verified**.
