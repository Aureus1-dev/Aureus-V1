# Living Hall — Pilot-5 launch handoff

## Launch decision

The member experience opens directly in the Hall. There is no logo, Mark placeholder, logo reveal, marketing sequence, forced tutorial, countdown, or account wall. The first working question is **How can we help?** The institutional logo and Member's Mark remain intentionally deferred and are not launch dependencies.

## What is integrated

- Nine local-time Hall plates, from deep-night embers through late-night settling.
- A restrained depth layer driven by the white-near/black-far pass, with at most four pixels of deliberate pointer parallax and no ambient camera drift.
- Subtle fire and foliage behavior; a morning bird departs once. Environmental sound is off by default, member-controlled, and persisted locally.
- Full reduced-motion behavior: static lighting remains complete while parallax, foliage, bird, and fire animation stop.
- A single persistent Hall shell across conversation, Journey, plans, opportunities, documents, community, calendar, settings, and supporting rooms.
- A keyboard-accessible Hall Index in place of permanent dashboard navigation. Escape and backdrop click close it; the current destination is announced and marked.
- Guest arrival without an account, identity continuity for returning members, and an account-preservation offer only after real work exists.
- First-run help begins with the member's need. Privacy notice, understanding, consent, mission creation, coordinated plan approvals, account choice, and execution status remain intact.
- Text and optional voice entry, inline plans and documents, global Steward tools, and Urgent Help on every member surface.
- Document provenance, AI-summary verification status, and the explicit statement that no external action has been taken.

## Asset contract

Runtime assets are in `apps/web/public/environments/hall/`. `manifest.json` is the portable asset manifest; `hall-manifest.ts` is the typed application contract. The beauty, normal, and depth passes are retained for later rendering work. The Pilot-5 frontend uses the depth pass conservatively and does not represent the AI-derived passes as geometry-accurate CAD.

## Production verification completed here

- TypeScript: `pnpm --filter @aureus-v1/web check-types`
- Automated web coverage: 135 suites, 759 tests
- Optimized Next.js build: 39 routes generated successfully

## Deployment checks that still require the target environment

1. Run the repository's production environment verification and database migrations using the target's real environment values.
2. Verify the configured AI provider with one live text exchange. If voice is enabled, run the documented real-device voice matrix with microphone permission and the live Realtime provider.
3. Verify one real SMTP delivery and the intended production CORS origin.
4. Test guest creation, returning-member restoration, Urgent Help, one document upload/summary/delete cycle, and account claim on the deployed URL.
5. Confirm every Hall image returns HTTP 200 with long-lived immutable caching and that mobile layout remains usable on the Pilot-5 devices.

Those environment checks are deliberately not represented as completed by this code change; they require the production credentials, database, provider connections, and physical devices.
