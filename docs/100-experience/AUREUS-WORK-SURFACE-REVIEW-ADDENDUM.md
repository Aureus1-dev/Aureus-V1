# Aureus Work Surface — Independent Review Addendum

Status: **Design authority addendum for PR #151**

This addendum records the combined decision after independent review of the Aureus Work Surface portfolio. It supplements `AUREUS-WORK-SURFACE-PORTFOLIO.md` and resolves the highest-value gaps identified before implementation begins.

The original portfolio remains the primary design direction. Where this addendum is more specific, this addendum governs.

---

## 1. Decisions adopted from independent review

We adopt these changes:

1. **Visible proof of work is required.**
   “Aureus is carrying” cannot be only a static label. A member must be able to see real, action-level progress while work is happening.

2. **The returning-member state must be designed as deliberately as first arrival.**
   A product that promises to carry work must make resumption obvious and calm.

3. **Carry Boundary detection and recovery must be specified, not left as copy.**
   We need explicit behavior for false positives, false negatives, decline behavior, and repeated prompts.

4. **3D remains deferred, but by a falsifiable rule.**
   Spatial/3D work is justified only if the validated flat Work Surface still fails to feel both capable and warm.

5. **Aureus needs a distinct structural signature, not only a palette.**
   Warm neutral + restrained accent is not enough to make Aureus recognizable.

6. **Urgent entry may bypass stories.**
   Stories are proof for a curious visitor, not friction for someone who arrived needing immediate help.

We do **not** adopt a universal crisis disclaimer after every substantive first message. That would make ordinary Aureus interactions feel like crisis-chat onboarding. Safety disclosure must be contextual to actual urgency/safety signals or an explicit urgent-help route.

---

## 2. Revised governing principles

Aureus Work Surface V1 is governed by five principles:

1. **Quiet surface, enormous depth.**
2. **Depth is proven by visible work, not claimed by a status label.**
3. **No sign-in wall before help.**
4. **The work is the interface. The outcome is the product.**
5. **Stewardship is the experience.**

A sixth operational rule applies to all five:

> Never simulate capability. If Aureus is not actually doing work, the interface must not imply that it is.

---

## 3. Visible Work mechanism

### 3.1 Purpose

The member should understand, at a glance:

- what outcome Aureus is working toward;
- what Aureus is doing now;
- what has already been verified;
- what is waiting on the member;
- what remains;
- when the work is actually done.

This is the core visual proof that Aureus is a steward rather than a chat box.

### 3.2 Work Surface grammar

Every active matter may expose these regions when relevant:

**Working on**
The member’s desired outcome in plain language.

**Now**
One live, human-readable action-level status line tied to real system activity.

Examples:
- “Checking eligibility for utility assistance…”
- “Comparing 6 housing options against your budget…”
- “Preparing the document package…”
- “Waiting for you to confirm the move-in date.”

**Aureus is carrying**
A compact list of active workstreams.

**Needs you**
Only the information, approval, physical action, signature, attendance, or judgment Aureus genuinely cannot carry.

**Found / Completed**
Verified discoveries, artifacts, actions, and outcomes.

**Done means**
The explicit completion condition for the matter.

### 3.3 Dynamic Work Trace

The interface should support a compact dynamic checklist or work trace.

Possible states:

- queued
- working
- completed
- needs-you
- blocked
- cancelled

Only one current action should visually dominate. Completed work recedes. Pending work stays quiet.

The trace may be collapsed by default when the member does not need detail.

### 3.4 Real events only

The visible work trace must be driven by actual orchestration/task events, not timers or decorative animation.

Prohibited:

- fake progress percentages;
- fake “thinking” steps;
- arbitrary cycling status text;
- simulated browser activity;
- claiming a search/check/action occurred when no corresponding task event exists.

### 3.5 No chain-of-thought exposure

Visible work means observable actions and evidence, **not internal model reasoning**.

Good:
- “Checking county rental-assistance eligibility.”
- “3 matching programs found.”
- “Application draft ready for your review.”

Not appropriate:
- hidden reasoning traces;
- internal scoring chains;
- private deliberation;
- raw model scratch work.

Aureus explains decisions in concise, user-facing rationale when useful, but does not expose private reasoning.

---

## 4. Arrival states

### 4.1 Ordinary public arrival

A first-time visitor lands directly in Aureus with no authentication wall.

Primary promise:

> **Tell Aureus what you want to accomplish. Aureus figures out how to get it done.**

Primary invitation:

> **How can we help?**

The multimodal composer is immediately usable.

A restrained story/proof area may sit below the primary request surface.

Stories use the pattern:

**Situation → What Aureus carried → Verified result**

No autoplay, hardship spectacle, vanity counters, or feature-grid behavior.

### 4.2 Urgent arrival

When the person arrives through an explicit urgent-help route, or their request itself clearly indicates immediate safety/emergency risk, Aureus may suppress nonessential story content and prioritize help.

The UI should become more direct, not more dramatic.

A contextual safety disclosure may appear near the active help surface.

Example generic wording:

> Aureus is an AI steward, not emergency services. If someone is in immediate danger, contact local emergency services now.

Where current authoritative jurisdiction-specific resources are available, Aureus may surface them contextually.

This is **not** a universal first-message banner.

### 4.3 Safety disclosure rules

Safety disclosure must:

- be triggered by actual context, not shown to everyone;
- be concise;
- not block the person from continuing unless a legal/safety gate genuinely requires it;
- not imply Aureus is a licensed professional when it is not;
- use current authoritative resources for jurisdiction-specific emergency/crisis information;
- never replace the underlying stewardship work when Aureus can still responsibly help.

---

## 5. Carry Boundary — detection and recovery

### 5.1 Definition

The Carry Boundary is reached when Aureus needs durable identity, persistence, permissions, or secure continuity to carry work beyond the current anonymous visit.

### 5.2 Strong Carry Boundary signals

Examples include the person explicitly asking Aureus to:

- continue this later;
- remember this for future visits;
- monitor something over time;
- notify or remind them later;
- preserve records or evidence;
- maintain deadlines/obligations across sessions;
- connect private accounts or tools;
- carry work across devices;
- perform an action that requires durable identity, authorization, consent, or secure account linkage.

### 5.3 Non-signals

These do **not** by themselves justify an account prompt:

- stating a goal;
- describing a hardship;
- asking a question;
- starting a plan;
- generating an artifact in the current visit;
- saying “I need housing,” “I need a job,” or another durable-sounding goal without asking Aureus to carry it beyond the current visit.

### 5.4 Uncertain detection

If the system is uncertain whether the person is asking for durable stewardship, do not jump directly to registration.

Ask a plain-language intent question first, for example:

> Do you want Aureus to carry this beyond this visit?

If yes, explain what continuity requires and present the account/claim step.

If no, continue in the current guest session without penalty.

### 5.5 Decline behavior

“Not now” must be a genuine path, visually credible and functionally complete.

After a person declines:

- continue the current visit;
- do not repeatedly prompt for the same carry reason;
- suppress the same prompt for that matter during the current session;
- ask again only when a materially new durable carry need arises or the person explicitly requests continuity later.

### 5.6 False positive recovery

If Aureus asks too early:

- the member can decline immediately;
- no work is lost;
- no feature is artificially blocked unless durable identity is genuinely required for that specific action;
- the same prompt is not repeated for the same reason during the session.

### 5.7 False negative recovery

If Aureus fails to recognize a carry need early enough, the interface must not silently imply that anonymous work will persist forever.

Before guest state would actually expire or become unavailable, Aureus should surface a truthful continuity choice when there is meaningful work at risk:

> This work is only available in this guest visit unless you choose to keep it. Would you like Aureus to carry it forward?

This is a continuity warning, not a registration advertisement.

The system must not promise persistence it cannot provide.

---

## 6. Returning-member experience

A returning member should not land on a generic dashboard by default.

### 6.1 One dominant active matter

Resume directly into the most relevant active work when confidence is high.

Show:

- matter name;
- current state;
- what changed since last visit;
- what Aureus is doing now, if anything;
- what needs the member;
- latest verified result.

### 6.2 Several active matters

Show a small number of quiet matter cards, not a dense operations dashboard.

Each card should contain only enough to answer:

- what is this;
- where is it now;
- does Aureus need me;
- what happens next.

Example:

> **Housing search**
> Needs you: confirm whether Upper Darby is acceptable.

Selecting a matter opens the full Work Surface for that outcome.

### 6.3 No active matters

Return to the same calm “How can we help?” surface used for first arrival.

The product should never punish a member for having nothing active.

---

## 7. Durable result objects

Important completed work must become durable, nameable objects rather than being trapped inside a chat scroll.

Examples:

- Housing comparison
- Application package
- Benefits eligibility summary
- Moving plan
- Budget
- Letter
- Work order
- Research brief
- Appointment preparation

Each durable result should support:

- a human-readable name;
- status;
- date/currentness;
- evidence/provenance where relevant;
- related matter;
- what “done” means;
- clear member actions if any remain.

This is required for meaningful return/resume behavior.

---

## 8. Aureus structural signature

Color and typography alone will not distinguish Aureus.

The first structural signature of Aureus should be the transformation:

> **request → visible stewardship → verified result**

That transformation should be recognizable even with the Aureus logo removed.

The second signature should be **burden-aware hierarchy**:

- what Aureus carries is visible but quiet;
- what the member must do is unmistakable;
- everything else recedes.

The third signature should be **evidence at completion**:

Aureus does not merely say “done.” It shows what changed and what proves completion.

These three structural behaviors matter more than decorative motifs.

---

## 9. 3D / environment gate

Full 3D, room reconstruction, multiple lighting renders, and elaborate environmental animation remain deferred.

The decision is now governed by a falsifiable test.

After the flat Work Surface exists at high fidelity, run a cold-start review with people who have not seen the design process.

Ask whether the experience feels, within the first 10 seconds:

- calm;
- capable;
- warm;
- trustworthy;
- like real work can happen here.

If the flat Work Surface achieves both **capable** and **warm**, spatial/3D work is optional enhancement and should compete normally for priority.

If it repeatedly feels capable but emotionally cold, test the smallest possible material-depth layer first:

- lighting depth;
- subtle dimensional Aureus mark;
- restrained parallax/material response;
- gentle environmental texture.

Do **not** jump directly to a literal room, nine lighting plates, decorative wildlife, or a simulated hearth.

The previous Hall failure is treated primarily as a narrative-coherence failure, not a polygon-count failure.

---

## 10. Implementation order after design approval

### Slice 0 — isolated interactive Work Surface prototype

Build real responsive UI behind an isolated route/flag.

Must include:

- ordinary anonymous arrival;
- urgent arrival variant;
- stories/proof;
- multimodal composer;
- first request;
- visible real-work trace;
- Needs You state;
- durable result/artifact state;
- Carry Boundary;
- decline/recovery behavior;
- returning member with one matter;
- returning member with several matters;
- reduced motion;
- mobile keyboard behavior;
- error/recovery state.

No production replacement yet.

### Slice 1 — front-door replacement

Only after Slice 0 passes founder review and independent design/engineering review.

### Slice 2 — real orchestration events

Connect visible work states to real task/orchestration events. Remove all prototype fixtures before production.

### Slice 3 — Carry Boundary implementation

Implement detection, intent confirmation, claim flow, suppression rules, and continuity recovery.

### Slice 4 — returning-member continuity

Implement durable matters/results and resume behavior.

### Slice 5 — environment decision

Run the 3D/material-depth gate defined above.

---

## 11. Acceptance gates

A build does not pass merely because CI is green.

### Functional

- No sign-in required before help.
- Guest can begin real work.
- Goal creation alone never triggers account creation.
- Carry Boundary can be invoked intentionally.
- Declining does not destroy or block current-session work.
- Same carry reason does not nag repeatedly.
- Visible work reflects real system events in production.
- Durable results are reachable outside the chat scroll.
- Returning member can understand current state quickly.
- Urgent-help path can bypass stories.
- Reduced-motion behavior works.
- Mobile keyboard does not hide the primary action.

### Emotional/craft

A new person should be able to answer yes to:

- I know what to do.
- This feels calm.
- This feels capable.
- I can tell real work is happening.
- I know what Aureus needs from me.
- I know what Aureus is carrying.
- I trust the interface to tell me when something is actually done.
- This does not feel like a generic AI chat wrapper.

### No-go

Do not ship if:

- visible work is fake or decorative;
- the member must choose an agent/tool before asking for help;
- account creation appears merely because a goal exists;
- a decline causes repeated nagging;
- “done” has no evidence or completion condition;
- the Work Surface becomes a dense dashboard;
- the new UI is technically polished but still emotionally flat.

---

## 12. Final combined design stance

Aureus should not prove intelligence by showing more software.

It should prove intelligence by making complicated work understandable, visible, and increasingly complete while asking as little of the member as responsibly possible.

The surface begins quiet.

Real work makes it richer.

Only the member’s true obligations rise to the foreground.

Identity is requested only when durable stewardship genuinely needs it.

Results become durable objects.

Completion is verified.

And the product earns warmth through relief, clarity, continuity, and care before it reaches for environmental spectacle.
