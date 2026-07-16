import { AppShell } from '../../design-system/layout';
import { AuthGate } from '../../design-system/components/auth';
import { VoiceOrchestrator, PersistentVoicePresence } from '../../design-system/components/voice';

/**
 * Applies to every member surface named in FPB-002 §3. `AuthGate`
 * decides whether the member belongs here before `AppShell`'s
 * navigation chrome renders; pre-authentication routes (`/login`,
 * `/register`, etc.) live outside this route group and never see either.
 *
 * `VoiceOrchestrator` (invisible) and `PersistentVoicePresence` (a small
 * floating widget) are mounted once here, as siblings of `AppShell`
 * rather than nested inside any particular screen — Dynamic Screen
 * Orchestration and the persistent steward presence (DOMAIN-005 Founder
 * Decisions 2–3) both need to keep working no matter which member
 * screen is currently rendered.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
      <VoiceOrchestrator />
      <PersistentVoicePresence />
    </AuthGate>
  );
}
