import { CitySheetVerificationGate } from '../../../design-system/components/city-sheet';

/**
 * A4 engineering — the Human Steward Verification Workflow, nested under
 * the member route group so it inherits authentication and `AppShell`
 * chrome from `(member)/layout.tsx`. `CitySheetVerificationGate` adds the
 * one thing that layout doesn't: restricting these routes to a Steward or
 * Platform Administrator, mirroring the backend's own `MANAGER_ROLES`
 * guard on `CitySheetController`.
 */
export default function CitySheetLayout({ children }: { children: React.ReactNode }) {
  return <CitySheetVerificationGate>{children}</CitySheetVerificationGate>;
}
