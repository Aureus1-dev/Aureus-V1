import { ArrivalRoom, ArrivalStage } from '../../../design-system/components/arrival';
import { LoadingState } from '../../../design-system/components/LoadingState/LoadingState';

/**
 * Next renders this while the route segment itself is still resolving —
 * earlier than any component in `WelcomeFlow` can run. Without it, the
 * very first painted frame of arrival is empty, and the Hall only
 * appears once the client has caught up.
 *
 * `ArrivalRoom` reveals itself only on the first mount of the visit, so
 * this room and the one `WelcomeFlow` mounts a moment later read as the
 * same continuous space rather than two arrivals.
 */
export default function WelcomeLoading() {
  return (
    <ArrivalRoom>
      <ArrivalStage stepKey="preparing">
        <LoadingState label="Preparing your welcome" />
      </ArrivalStage>
    </ArrivalRoom>
  );
}
