# Aureus Work Surface — Complete Experience Portfolio

**Status:** Design direction for implementation and independent review  
**Base:** `main` at `159b6e5168d7f0d0f37ea10bd005130b11b10057`  
**Purpose:** Replace the current Living Hall as the primary product metaphor with a guest-first, calm, capable work surface that makes Aureus feel simple on the surface and powerful underneath.

---

## 1. North Star

Aureus should feel like one steward between a person and all the complexity required to get something done.

The first screen should communicate, without explanation:

> **Tell Aureus what you want to accomplish.**  
> **Aureus figures out how to get it done.**
>
> **How can we help?**

The design principle is:

> **Quiet surface. Enormous depth.**
>
> **Aureus hides complexity, not capability.**

The interface should look simple before work exists. Once the person asks for help, the work itself becomes visible: what Aureus is carrying, what it found, what needs approval, what is finished, and what remains.

Aureus is not a dashboard, agent marketplace, generic chatbot, virtual living room, or menu of AI tools. It is a steward.

---

## 2. The Product Feeling

The opening experience must create four simultaneous impressions:

1. **Peace** — not from scenery, but from reduced burden and visual restraint.
2. **Capability** — the person should immediately believe serious work can happen here.
3. **Warmth** — human and welcoming without becoming decorative or sentimental.
4. **Readiness** — Aureus feels awake, responsive, and prepared to act.

The product should never need to look busy to look intelligent.

### The intended emotional sequence

**Arrival:** “This is calm.”  
**First request:** “It understood me.”  
**Work begins:** “It is actually doing something.”  
**Progress appears:** “I do not have to hold all of this in my head.”  
**Result:** “It carried the work.”  
**Return:** “It knows where we left off.”

That sequence is more important than any individual visual motif.

---

## 3. Guest-First Rule — No Sign-In Wall

Aureus does **not** begin on a sign-in screen.

A new visitor enters the product directly.

They can:

- understand what Aureus is,
- see public proof/stories,
- ask for help,
- talk by voice,
- type,
- attach a file,
- show Aureus something,
- receive immediate research, explanation, triage, and planning,
- explore the product,

without creating an account.

The current silent guest-session architecture is directionally correct and should remain.

### Account creation boundary

Aureus asks for an account **only when persistent stewardship is needed**.

That means the claim/sign-in moment occurs when the person explicitly asks Aureus to do something that requires carrying work beyond the current anonymous visit or across devices/time.

Examples:

- “Keep working on this for me.”
- “Remember this and bring it back tomorrow.”
- “Track this deadline.”
- “Carry this application through completion.”
- “Watch for updates and tell me when something changes.”
- “Continue this on my phone/laptop later.”
- “Save these documents and keep the matter together.”

### The account prompt should say why

Not:

> Create an account to unlock this feature.

Instead:

> **I can carry this with you.**  
> To keep the work safe and bring it back across time and devices, I need a place to remember it for you.
>
> **Create your free Aureus account**  
> **Keep working just for this visit**

The person should always understand the exact reason Aureus is asking.

### Never prompt merely because a goal exists

The current `GuestClaimBanner` appears once a guest has a goal. That is too early for the new rule.

A goal is not consent for persistent stewardship.

The claim boundary must be tied to a concrete persistence/carry action, not generic progress.

### Never make account creation feel like payment

Account creation is for continuity, identity, permissions, memory, privacy controls, and stewardship across time — never a commercial gate.

---

## 4. Public Arrival — Stories Before Account

The front door should provide proof without becoming a marketing website.

Public stories answer:

> “What does Aureus actually do for people?”

They should be short, real, outcome-centered, and visually quiet.

### Stories are not testimonials first

The strongest story unit is:

**Situation → What Aureus carried → Result**

Example structure:

> **Needed to move within three weeks**  
> Aureus organized the housing search, assistance options, documents, calls, deadlines, and moving plan.  
> **Result:** application submitted, assistance secured, move completed.

Another:

> **Fell behind on utilities after losing hours at work**  
> Aureus found eligible assistance, prepared the application packet, tracked deadlines, and kept the household plan together.  
> **Result:** shutoff avoided and arrears reduced.

Another:

> **Small business was losing leads after hours**  
> Aureus captured inquiries, qualified the work, prepared the next step, and kept the owner from waking up to a pile of missed opportunities.  
> **Result:** fewer lost leads and faster follow-up.

### Story design

Stories should not dominate the first viewport.

They can sit below the primary work surface as a restrained horizontal rail or three-card proof strip:

- one People story,
- one family/learning story,
- one business/work story.

No autoplay carousel.
No giant portraits.
No fake social-proof counters.
No glossy “AI changed my life” copy.

Each story may expand into:

- what happened,
- what Aureus did,
- what required the member,
- what required a human steward,
- what evidence verified the outcome.

That teaches the stewardship model through real outcomes.

---

## 5. Competitive Research — What to Learn, What Not to Copy

### Apple

**Useful principles:**

- Simplicity is not minimalism.
- Every element must earn its place.
- Strong hierarchy makes the next action obvious.
- Agency means getting people directly to the task.
- Craft is visible in typography, spacing, animation, reliability, and detail.
- Delight comes from reinforcing the right emotion, not adding decorative effects.

**Aureus application:**

- one dominant front door,
- exact language,
- disciplined spacing,
- low visual noise,
- controls appear when needed,
- beautiful execution without ornament for ornament’s sake.

**Do not copy:** Apple marketing layouts as a product shell. Aureus must still feel operational, not like a product brochure.

References:
- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/videos/play/wwdc2026/250/
- https://developer.apple.com/videos/play/wwdc2025/359/

### Google / Gemini

**Useful principles:**

- One familiar entry point can hide huge capability.
- Multimodal depth can live behind a very simple starting surface.
- Connected tools and proactive assistance should not require the person to become a systems integrator.

**Aureus application:**

- one request surface,
- text + voice + camera + files available naturally,
- tools remain behind Aureus,
- personalization/connected context is permissioned and progressive.

**Do not copy:** a catalog of model modes or product chips that force the member to select the implementation method.

Reference:
- https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/

### Microsoft Copilot

**Useful principles:**

- Move from a static prompt box toward a task-aware workspace.
- Start focused; reveal tools and controls as they become relevant.
- Work moves across apps, tasks, and teams; the AI surface should preserve continuity.

**Aureus application:**

- composer expands as needed,
- work state appears after intent is understood,
- relevant approvals/tools surface contextually,
- work-in-progress is easy to return to.

**Do not copy:** app-centric enterprise navigation as the primary mental model.

Reference:
- https://www.microsoft.com/en-us/copilot/blog/2026/05/28/introducing-a-new-design-for-microsoft-365-copilot/

### Linear

**Useful principles:**

- “Don’t compete for attention you haven’t earned.”
- Navigation should recede once the person is working.
- Dense information can still feel calm when hierarchy is strong and placement is consistent.
- Design quality is often the absence of paper cuts.

**Aureus application:**

- work content gets visual priority,
- secondary navigation dims/recedes,
- persistent controls stay predictable,
- no decorative element may compete with the active task.

**Do not copy:** issue-tracker density for people who are not project managers.

References:
- https://linear.app/now/behind-the-latest-design-refresh
- https://linear.app/changelog/2026-03-12-ui-refresh

### Claude / Anthropic

Recent direction in Claude is toward one interface that can determine which capabilities are required rather than forcing the user to switch manually between separate tools.

**Aureus application:**

The member should not have to choose “document mode,” “research mode,” “agent mode,” “design mode,” or “browser mode.” Aureus chooses the machinery based on the intended outcome.

Reference context:
- Anthropic’s 2026 unified Claude/Cowork direction and integrated work-product tools.

### Market conclusion

The market is converging on:

- one request surface,
- progressive disclosure,
- multimodal input,
- integrated artifacts,
- agentic execution,
- persistent workspaces.

Aureus must go one conceptual layer further:

> **The interface is not organized around AI capabilities. It is organized around the person’s outcome and the stewardship required to reach it.**

That is the differentiator.

---

## 6. Primary Information Architecture

### State A — Public / Guest Arrival

Top-level screen:

- Aureus mark
- optional tiny “Sign in” link for returning members, visually secondary
- no account wall
- hero promise
- “How can we help?”
- multimodal composer
- restrained public stories/proof below

Desktop concept:

```text
┌──────────────────────────────────────────────────────────────┐
│ Aureus                                             Sign in   │
│                                                              │
│                                                              │
│      Tell Aureus what you want to accomplish.                │
│      Aureus figures out how to get it done.                  │
│                                                              │
│                  How can we help?                            │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ Tell us what you need…                              │   │
│   │                                                      │   │
│   │  + File    Camera    Talk                       Send │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│      You can start without an account.                       │
│                                                              │
│  ──────────────────────────────────────────────────────────  │
│  What Aureus has helped carry                                │
│  [ Housing story ] [ Family story ] [ Business story ]       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Mobile concept:

```text
┌──────────────────────────────┐
│ Aureus              Sign in │
│                              │
│ Tell Aureus what you want    │
│ to accomplish.               │
│ Aureus figures out how       │
│ to get it done.              │
│                              │
│ How can we help?             │
│                              │
│ ┌──────────────────────────┐ │
│ │ Tell us what you need…   │ │
│ │                          │ │
│ │ +   Camera   Talk   Send │ │
│ └──────────────────────────┘ │
│                              │
│ Start without an account.    │
│                              │
│ What Aureus has carried      │
│ [ story ]                    │
│ [ story ]                    │
└──────────────────────────────┘
```

### State B — Understanding

Once the person speaks/types, the interface should not immediately explode into cards.

Aureus listens and asks only what it genuinely needs.

The center remains conversational until enough context exists to create work.

### State C — Work Begins

Once a concrete outcome exists, the surface transforms.

The transcript remains available, but the primary visual object becomes the work.

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│ Move before October 1                              ···       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AUREUS IS CARRYING                                          │
│                                                              │
│  Housing search                           In progress         │
│  Moving assistance                       4 programs checked  │
│  Documents                               3 of 5 ready         │
│  Move plan                               Drafting             │
│                                                              │
│  NEEDS YOU                                                   │
│  Confirm whether Upper Darby is acceptable          Review  │
│                                                              │
│  FOUND                                                       │
│  3 viable units · 2 assistance paths · 1 deadline tomorrow   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Ask Aureus anything about this work…                 Talk    │
└──────────────────────────────────────────────────────────────┘
```

### State D — Persistence Boundary

If the guest says:

> “Yes, keep carrying this.”

then account creation appears in-context.

Not a redirect with no explanation.

The work remains visually behind/around the prompt so the person understands nothing is lost.

```text
Aureus can keep carrying this after you leave.

To bring the work back safely across time and devices, create your free account.

[ Continue with email ]
[ Continue with Apple ]
[ Continue with Google ]

Not ready? [ Keep working for this visit ]
```

The session should be claimable without losing the active conversation or work state.

### State E — Returning Member

Returning members should land on the most relevant state, not a generic dashboard.

Examples:

- urgent active matter → active matter/work surface,
- one dominant in-progress outcome → resume it,
- several active outcomes → calm “Your work” overview,
- nothing active → same simple front door.

---

## 7. The Composer

The composer is the front door to the whole system.

It must feel unusually good.

### Required modes

- type,
- voice,
- camera / “show me,”
- upload file/image,
- paste content,
- optional location/context when relevant and consented.

### The member should never need to choose the implementation tool

Do not expose:

- research mode,
- web mode,
- document agent,
- housing agent,
- finance agent,
- model picker,
- “deep reasoning” mode,

as primary first-message decisions.

Aureus routes the work.

### Composer visual rules

- generous tap targets,
- one obvious send action,
- no mysterious counters,
- no shifting width/height during focus,
- stable keyboard behavior,
- mobile-first,
- attachments visibly anchored,
- voice state unmistakable,
- recovery always available.

---

## 8. Work Surface Grammar

Every substantial Aureus work state should be expressible through a small shared grammar.

### Working on

What outcome is being pursued?

### Aureus is carrying

What Aureus has taken responsibility for.

### Together

What requires member participation plus Aureus support.

### Needs you

The smallest current decision/input/approval required from the member.

### A person must

What genuinely requires human authority, judgment, verification, representation, physical action, or relationship.

### Done means

The evidence required to call the work complete.

### Found / Results

Useful evidence or outputs generated so far.

This grammar should map directly to the broader Carry Card doctrine:

- You carry
- Aureus carries
- Together
- A person must
- Done means

The work surface makes that doctrine visible without making it bureaucratic.

---

## 9. Visual System

### Direction

**Light-first, warm-neutral, premium, restrained.**

Dark mode can exist, but the current deep-dark room should no longer define the brand.

### Surface qualities

- warm white / paper / stone neutrals,
- deep near-black text,
- restrained Aureus gold used for meaning, not decoration,
- gentle depth through elevation and material contrast,
- very limited borders,
- larger spacing than conventional dashboards,
- typography carries hierarchy before boxes do.

### Typography

The primary type system should feel:

- literate,
- contemporary,
- humane,
- highly readable,
- capable of both short conversational language and serious work artifacts.

Use no more than two families unless a strong accessibility reason requires otherwise.

### Gold

Gold is not a gradient wallpaper.

It should signal:

- Aureus identity,
- completion,
- trusted state,
- a meaningful selected/active state,
- occasionally warmth/highlight.

If everything is gold, nothing is Aureus.

### Corners

Soft, but not bubbly.

Avoid the generic “everything is a 24px AI pill” aesthetic.

### Icons

Simple, familiar, low-noise.

No ornamental pseudo-3D icon set just to look futuristic.

---

## 10. Motion

Motion exists to communicate state.

Good uses:

- composer expands when more room is needed,
- a work item moves from searching → found,
- an approval enters when Aureus reaches a permission boundary,
- a completed item resolves softly,
- context panel opens from the object it belongs to,
- voice state breathes while listening.

Bad uses:

- random birds,
- perpetual ambient object movement,
- decorative camera drift,
- floating particles,
- large parallax scenes behind reading surfaces,
- motion that competes with serious work.

### Motion rule

> If the movement does not explain state, location, causality, or progress, remove it.

Respect reduced-motion preferences fully.

---

## 11. Audio

Audio should be functional first.

Required:

- excellent voice interaction,
- clear start/listening/thinking/responding/end states,
- optional subtle confirmation sounds where useful,
- never mandatory ambience.

The product does **not** need fireplace crackle to feel peaceful.

If ambient audio exists later, it must be:

- opt-in,
- high quality,
- extremely subtle,
- easy to disable,
- never generated from crude noise if it sounds synthetic or distracting.

Silence is a valid premium state.

---

## 12. 3D / Spatial Direction

### Decision: do not build a full 3D Hall first

The current visual concept has multiple lighting plates and depth assets. Those can be preserved as exploration material, but they should not dictate the next product architecture.

Before investing in 3D:

1. build desktop high-fidelity work-surface prototype,
2. build mobile high-fidelity prototype,
3. validate emotional and functional targets,
4. implement the core surface,
5. test with real work,
6. only then decide whether spatial depth improves the experience.

### If spatial depth is added later

Use it as **material depth**, not as a literal virtual room the person must inhabit.

Potential uses:

- subtle responsive light behind the central work surface,
- shallow layered depth in the Aureus mark,
- contextual environmental shifts during focus/rest states,
- premium transitions between “arrival” and “work,”
- optional immersive mode for specific experiences.

The work must always remain more important than the environment.

### Existing nine-lighting / render assets

Keep them until the new direction is validated.

Do not spend production time increasing their realism yet.

After V1 Work Surface is usable, decide among three paths:

1. retire them,
2. reuse as very restrained background ambience,
3. evolve them into an optional spatial experience.

---

## 13. What Happens to the Living Hall

The existing Living Hall should not be deleted immediately.

It should be demoted from **primary UI metaphor** to **legacy/optional atmosphere** while the Work Surface proves itself.

Specific current elements to remove from primary experience:

- CSS bird,
- faux-fire glow as a focal element,
- persistent room scene behind every member workflow,
- ambience as a substitute for emotional design.

Potentially reusable:

- time-aware lighting concept,
- reduced-motion handling,
- gentle material depth,
- environmental state framework,
- room-to-context mapping if later useful.

---

## 14. Stories / Proof System

Stories need a real data contract, not hardcoded marketing cards forever.

Suggested structure:

```ts
type StewardshipStory = {
  id: string;
  title: string;
  situation: string;
  carried: string[];
  memberRole?: string[];
  humanRole?: string[];
  result: string;
  evidence?: string[];
  category: 'people' | 'family' | 'business';
  permission: 'public' | 'anonymous-public';
};
```

Rules:

- explicit permission before public use,
- anonymize by default,
- never invent outcomes,
- outcome claims should be evidence-backed,
- do not expose sensitive details,
- no manipulative hardship imagery,
- stories should teach what stewardship means.

---

## 15. Authentication / Claim Architecture Changes Required

### Keep

- silent guest session creation,
- help before login,
- session-claim concept,
- privacy explanation,
- no feature paywall.

### Change

1. Remove global account prompt triggered merely by existence of a goal.
2. Remove account creation as a routine step in general welcome/onboarding.
3. Create an explicit **Carry Boundary** event/state.
4. Trigger account claim only when persistent stewardship is requested/required.
5. Preserve full active work while the claim flow occurs.
6. Permit “continue just this visit” where safe and meaningful.
7. Returning-member sign-in remains available but secondary at public arrival.

### Carry Boundary examples

A carry boundary is reached when the requested work requires one or more of:

- persistence after browser/session ends,
- cross-device recall,
- long-running monitoring,
- deadlines/reminders,
- stored documents or records,
- durable permissions,
- connected accounts,
- scheduled actions,
- institutional or human-steward coordination,
- identity verification,
- consequential action that requires a durable audit trail.

The system should know **why** the account is required and say so plainly.

---

## 16. Responsive Behavior

### Mobile is not a compressed desktop

Mobile priorities:

- one-handed composer access,
- minimal header,
- no overlapping New/History/Talk controls,
- work state collapses into readable vertical sections,
- sticky bottom composer only when appropriate,
- safe keyboard behavior,
- voice entry immediately reachable,
- no hidden critical action behind hover.

### Desktop

Desktop can use width for:

- work + evidence side-by-side,
- artifact preview,
- narrow conversation/context rail,
- visible progress without dashboard clutter.

The work itself should own the largest region.

---

## 17. Accessibility

Non-negotiable:

- WCAG-aligned contrast,
- complete keyboard navigation,
- visible focus states,
- semantic headings/regions,
- screen-reader labels that describe state, not just controls,
- reduced motion,
- voice is additive, never required,
- no information encoded by color alone,
- text scaling without breakage,
- large enough tap targets,
- predictable focus after state transitions.

The emotional design must survive accessibility settings.

---

## 18. Performance / Craft Gates

The visual redesign is not successful if it feels fragile.

Targets:

- no layout jump when session restoration completes,
- no composer jump during focus,
- no delayed icon/font reflow that moves primary actions,
- stable mobile viewport with keyboard,
- graceful low-bandwidth loading,
- no large hero video required for first interaction,
- animation stays smooth on mid-tier mobile hardware,
- core help path works with JavaScript/network degradation as responsibly possible,
- first meaningful interaction appears quickly.

The person should never wait through a cinematic intro to ask for help.

---

## 19. First-Run Copy

Primary:

> **Tell Aureus what you want to accomplish.**  
> **Aureus figures out how to get it done.**

Invitation:

> **How can we help?**

Composer placeholder:

> Tell us what you need, what happened, or what you’re trying to get done.

Guest reassurance:

> Start without an account.

Returning-member control:

> Sign in

Do not put paragraphs of capability copy above the first request.

---

## 20. Carry-Boundary Copy

Default:

> **I can carry this with you.**
>
> To keep this work safe and bring it back across time and devices, I need a place to remember it for you.

Primary action:

> **Create your free Aureus account**

Secondary, when safe:

> **Keep working for this visit**

For a deadline/monitoring request:

> **I can keep watch on this after you leave.**
>
> To do that, I need an account so I can securely keep the work, permissions, and updates connected to you.

For connected tools:

> **I can take the next step in your account.**
>
> Sign in to Aureus first so your permission and the resulting action are tied to you and recorded correctly.

---

## 21. Implementation Portfolio — Complete Slice Plan

### Slice 0 — Design foundation

Deliver:

- design tokens,
- typography hierarchy,
- spacing rhythm,
- light/dark surface rules,
- icon rule,
- motion rule,
- responsive breakpoints,
- high-fidelity desktop arrival,
- high-fidelity mobile arrival,
- high-fidelity active-work state,
- carry-boundary state.

No 3D production work yet.

### Slice 1 — Public Guest Front Door

Replace the primary Living Hall arrival with Work Surface arrival.

Deliver:

- guest-first landing,
- promise + How can we help,
- stable multimodal composer,
- secondary sign-in link,
- story/proof rail,
- no sign-in redirect,
- no forced intro,
- no CSS bird/fire as primary visual layer.

### Slice 2 — Work-State Transformation

When enough intent exists, create the first real work representation.

Deliver:

- working-on header,
- Aureus carrying,
- needs-you,
- results/evidence,
- done-means,
- continuity with transcript.

### Slice 3 — Carry Boundary / Claim

Deliver:

- persistence requirement detection,
- contextual account prompt,
- session claim without losing work,
- “this visit only” continuation where allowed,
- no generic goal-triggered account banner,
- remove routine signup offer from generic welcome.

### Slice 4 — Returning Work

Deliver:

- resume most relevant active work,
- calm multi-work overview only when necessary,
- no dashboard for users with one obvious active outcome.

### Slice 5 — Craft Pass

Deliver:

- motion tuning,
- typography tuning,
- accessibility audit,
- keyboard/focus audit,
- mobile keyboard/browser testing,
- performance budget,
- production screenshot comparison,
- subjective design review.

### Slice 6 — Spatial / Ambient Decision

Only after real usage:

- assess whether current rendered Hall assets add value,
- prototype restrained depth if justified,
- compare with flat/material version,
- keep only if it measurably improves calm, comprehension, or identity.

---

## 22. Acceptance Criteria

Aureus Work Surface V1 is not complete because screenshots look attractive.

It is complete when:

### Functional

- new visitor can ask for help without an account,
- no involuntary sign-in wall exists in first-run help path,
- returning member can choose sign in,
- voice/text/file/camera entry is coherent,
- first request does not require tool selection,
- work state appears once an outcome exists,
- account claim happens only at a real carry boundary,
- claiming preserves the current work,
- no unrelated capability panel appears without contextual relevance.

### Emotional

A founder/member walkthrough can answer **yes** to:

- Does this feel peaceful?
- Does this feel capable?
- Does it look like serious work happens here?
- Does it feel simple without feeling dumb?
- Does it feel warm without becoming decorative?
- Does it feel unmistakably like Aureus?

### Craft

- no overlapping controls,
- no ambiguous counters,
- no focus jumps,
- no obvious placeholder art,
- no synthetic atmosphere that reads as fake,
- no decorative animation competing with work,
- mobile works without apology,
- reduced-motion works,
- keyboard/screen reader path works,
- production experience matches reviewed experience.

### Stewardship

- Aureus tells the truth about what it is doing,
- the person can see what Aureus carries vs what they carry,
- approvals appear at the right moment,
- the member retains agency,
- account creation is explained by a real need,
- the ledger/evidence can support completion claims.

---

## 23. No-Go List

Do not ship:

- sign-in as the first page,
- a giant feature menu on arrival,
- agent/model selection as the primary decision,
- random decorative wildlife,
- a fake fireplace as the source of emotional warmth,
- autoplay ambient sound,
- a forced cinematic onboarding sequence,
- a dashboard before the user has work,
- account prompts because “we have something worth saving” unless persistence is actually requested,
- a 3D environment that reduces readability or performance,
- a redesign that passes tests but still feels emotionally flat.

---

## 24. Review Protocol

Before implementation merge, independently review the portfolio against:

- Apple: purpose, agency, simplicity, craft, delight,
- Google/Gemini: one front door + multimodal depth,
- Microsoft Copilot: task-aware workspace + progressive disclosure,
- Linear: work owns attention,
- current leading AI assistants: integrated capability without manual mode switching,
- Aureus doctrine: stewardship, agency, truth, privacy, carrying work to completion.

Then perform two reviews:

### Cold-start review

A person who knows nothing about Aureus gets 10 seconds.

They should understand:

- where to begin,
- that they can ask naturally,
- that no account is required to start,
- that Aureus does more than chat.

### Real-work review

Give Aureus a genuine multi-step need.

The interface should progressively become more operational as the work becomes more concrete.

If the screen remains “just chat,” the redesign has failed.

---

## 25. Final Design Doctrine

> **Aureus should look simple before you need it and reveal its depth only when your work requires it.**
>
> **No sign-in wall before help.**
>
> **No tool maze.**
>
> **No decorative complexity pretending to be intelligence.**
>
> **The work is the interface.**
>
> **The outcome is the product.**
>
> **Stewardship is the experience.**
