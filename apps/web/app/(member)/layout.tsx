import { SkipLink } from '../../design-system/accessibility';
import { AuthGate } from '../../design-system/components/auth';
import { VoiceOrchestrator } from '../../design-system/components/voice';
import {
  SurfaceTracker,
  TextInterfaceOrchestrator,
  GlobalActionPalette,
} from '../../design-system/components/steward';
import { UrgentHelpAffordance } from '../../design-system/components/urgent-help';
import { ArrivalSessionFallback } from '../../design-system/components/arrival';
import { GuestClaimBanner } from '../../design-system/components/guest';
import {
  EnvironmentProvider,
  PlaceProvider,
  HallFrame,
  LivingHall,
  HallStage,
} from '../../design-system/components/environment';
import { V1_FEATURE_FLAGS } from '../../lib/config/v1-feature-scope';

/**
 * Applies to every member surface.
 *
 * ── The Hall is the application ────────────────────────────────────
 *
 * `LivingHall` is mounted here, once, and does not unmount for the life
 * of the session. The App Router keeps a layout mounted while the route
 * beneath it changes, so this is what turns the environment from
 * something rebuilt on every navigation into a place the member stays
 * inside. AUREUS-201: "The Hall remains present throughout the member
 * experience. Only the current interaction changes."
 *
 * `HallStage` is the application's `<main>`, and it lives *inside* the
 * room. Previously `AppShell` owned `<main>` and the Hall was rendered
 * into it on two routes — the environment nested inside a cell of the
 * interface. That inversion is what this corrects.
 *
 * The Hall wraps `AuthGate` rather than sitting inside it, deliberately.
 * A member whose session is still being restored, or has expired, is
 * still standing in the Hall — they see the room and the hearth while
 * that resolves, not a bare screen. AUREUS-203: "Members should never
 * experience blank loading screens." It also means `<main>` exists in
 * every state, so the skip link always has somewhere to go.
 *
 * ── What is no longer here ─────────────────────────────────────────
 *
 * `AppShell` — the header, the permanent navigation rail and the docked
 * Steward panel — is gone, along with the floating Steward widget.
 * AUREUS-BP-001: "Permanent left and right rails are prohibited… No
 * permanent Steward sidebar remains." AUREA-001: "There are no feature
 * dashboards." AUREUS-203 allows traditional navigation controls only as
 * *secondary*, and a twenty-link rail is not secondary.
 *
 * Nothing became unreachable. Movement is now, in canon order: asking
 * the Steward; the openings in the Hall's own wall, which always include
 * the way home; and the Index, which is keyboard-first and lists every
 * place. Everything the docked panel and the floating widget showed —
 * the recent conversation, decisions waiting on the member — is rendered
 * in full by `StewardHome`, in the Steward's Study.
 *
 * The invisible orchestrators are unchanged. `VoiceOrchestrator` and
 * `TextInterfaceOrchestrator` (both invisible) and `SurfaceTracker`
 * (invisible) are mounted once so Dynamic Screen Orchestration and
 * context continuity keep working no matter which surface is rendered.
 *
 * C2 — V1 Scope Lockdown: voice is cut for V1 entirely, so
 * `VoiceOrchestrator` is only mounted when the flag is on. It stays
 * fully recoverable by flipping `V1_FEATURE_FLAGS.voice` — nothing here
 * is deleted.
 *
 * `UrgentHelpAffordance` is mounted here so it is present on every
 * member surface without per-page wiring. It is a safety affordance, and
 * crisis access is never allowed to sit behind a conversation, a
 * transition, or a place.
 *
 * `SkipLink` is the first child so it is the very first thing a keyboard
 * or screen-reader member reaches, and `GuestClaimBanner` still renders
 * in normal flow directly above the room rather than as another floating
 * corner widget — it carries a full sentence of copy a badge could not.
 * `HallFrame` is what lets it: one viewport-tall column, banner first,
 * room taking the rest, so the document never grows past the screen and
 * the hearth is never scrolled away.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <EnvironmentProvider>
      <PlaceProvider>
        <SkipLink targetId="main-content" />
        <HallFrame above={<GuestClaimBanner />}>
          <LivingHall>
            <HallStage>
              <AuthGate fallback={<ArrivalSessionFallback />}>{children}</AuthGate>
            </HallStage>
          </LivingHall>
        </HallFrame>
        <SurfaceTracker />
        {V1_FEATURE_FLAGS.voice ? <VoiceOrchestrator /> : null}
        <TextInterfaceOrchestrator />
        <GlobalActionPalette />
        <UrgentHelpAffordance />
      </PlaceProvider>
    </EnvironmentProvider>
  );
}
