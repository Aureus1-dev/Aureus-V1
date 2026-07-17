import { AppShell } from '../../design-system/layout';
import { AuthGate } from '../../design-system/components/auth';
import { VoiceOrchestrator } from '../../design-system/components/voice';
import {
  SurfaceTracker,
  TextInterfaceOrchestrator,
  StewardWorkspace,
  GlobalActionPalette,
} from '../../design-system/components/steward';

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
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
      <SurfaceTracker />
      <VoiceOrchestrator />
      <TextInterfaceOrchestrator />
      <StewardWorkspace />
      <GlobalActionPalette />
    </AuthGate>
  );
}
