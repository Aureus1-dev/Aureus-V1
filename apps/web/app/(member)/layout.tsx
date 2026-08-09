import { AppShell } from '../../design-system/layout';
import { SkipLink } from '../../design-system/accessibility';
import { AuthGate } from '../../design-system/components/auth';
import { VoiceOrchestrator } from '../../design-system/components/voice';
import {
  SurfaceTracker,
  TextInterfaceOrchestrator,
  StewardWorkspace,
  GlobalActionPalette,
} from '../../design-system/components/steward';
import { UrgentHelpAffordance } from '../../design-system/components/urgent-help';
import { ArrivalSessionFallback } from '../../design-system/components/arrival';
import { V1_FEATURE_FLAGS } from '../../lib/config/v1-feature-scope';

/**
 * Applies to every member surface named in FPB-002 §3. `AuthGate`
 * decides whether the member belongs here before `AppShell`'s
 * navigation chrome renders; pre-authentication routes (`/login`,
 * `/register`, etc.) live outside this route group and never see either.
 *
 * `VoiceOrchestrator`/`TextInterfaceOrchestrator` (both invisible) and
 * `SurfaceTracker` (invisible) are mounted once here, as siblings of
 * `AppShell`, so Dynamic Screen Orchestration and context continuity
 * (DOMAIN-005 Founder Decisions 2–3; DOMAIN-007 Founder Decision 1) keep
 * working no matter which member screen is currently rendered.
 * `StewardWorkspace` is the single persistent floating presence
 * (DOMAIN-007 Founder Decision 2) — it composes the voice presence
 * (orb, state, controls) and the workspace panel into one surface itself,
 * so `PersistentVoicePresence` (DOMAIN-005) is deliberately not also
 * mounted here: never two competing floating widgets.
 *
 * C2 — V1 Scope Lockdown: voice is cut for V1 entirely (LAUNCH-001:
 * "voice entirely"), so `VoiceOrchestrator` (the tool-call executor for
 * voice-driven navigation) is only mounted when the flag is on. It stays
 * fully recoverable by flipping `V1_FEATURE_FLAGS.voice` — nothing here
 * is deleted.
 *
 * B2 (Gate B — The Gate): `UrgentHelpAffordance` is mounted the same way,
 * fixed bottom-left, so it is present on every member surface without
 * per-page wiring. It is a safety affordance, not a conversation surface,
 * so it does not count against the "never two competing floating widgets"
 * rule above (that rule is about two agent presences) — it coexists with
 * `StewardWorkspace` (bottom-right) and `GlobalActionPalette` (top-right)
 * in the one corner they leave free.
 *
 * `SkipLink` is the first child, before the Hall shell, so it is the first
 * thing a keyboard or screen-reader member reaches. Progressive account
 * creation now lives inside `AppShell`: the preservation offer belongs in
 * the Hall and appears only after real work exists.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate fallback={<ArrivalSessionFallback />}>
      <SkipLink targetId="main-content" />
      <AppShell>{children}</AppShell>
      <SurfaceTracker />
      {V1_FEATURE_FLAGS.voice ? <VoiceOrchestrator /> : null}
      <TextInterfaceOrchestrator />
      <StewardWorkspace />
      <GlobalActionPalette />
      <UrgentHelpAffordance />
    </AuthGate>
  );
}
