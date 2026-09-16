import { BusinessContextSwitcher } from '../../../design-system/components/business-console';
import { BusinessOwnerHome } from '../../../design-system/components/business-owner';

/**
 * Step 5 — Business Owner Experience.
 *
 * The owner's first viewport is outcome and responsibility state, not
 * configuration. Setup, members, knowledge and operations remain fully
 * reachable at `/business/admin`; they were moved rather than removed
 * because they are secondary to "what is Aureus carrying", not obsolete.
 */
export default function BusinessPage() {
  return (
    <>
      <BusinessContextSwitcher />
      <BusinessOwnerHome />
    </>
  );
}
