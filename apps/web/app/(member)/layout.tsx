import { AppShell } from '../../design-system/layout';
import { AuthGate } from '../../design-system/components/auth';

/**
 * Applies to every member surface named in FPB-002 §3. `AuthGate`
 * decides whether the member belongs here before `AppShell`'s
 * navigation chrome renders; pre-authentication routes (`/login`,
 * `/register`, etc.) live outside this route group and never see either.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
