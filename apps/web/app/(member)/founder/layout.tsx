import { FounderGate } from '../../../design-system/components/founder';

/**
 * The Founder Operating System (PR-003) — nested under the member route
 * group so it inherits authentication, `AppShell` chrome, and the
 * voice/text orchestrators from `(member)/layout.tsx`. `FounderGate` adds
 * the one thing that layout doesn't: restricting these routes to a
 * Platform or System Administrator.
 */
export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return <FounderGate>{children}</FounderGate>;
}
