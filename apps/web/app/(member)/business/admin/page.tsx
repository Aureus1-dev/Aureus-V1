import Link from 'next/link';
import {
  BusinessConsoleHome,
  BusinessContextSwitcher,
  BusinessMembersPanel,
  BusinessOperationsPanel,
} from '../../../../design-system/components/business-console';

/**
 * Step 5 — secondary/administrative business capability.
 *
 * Everything that used to sit on `/business` still lives here, unchanged:
 * workspace setup, profile/publishing, members and invitations, and
 * operations. Moving it behind navigation keeps the owner's home focused on
 * responsibility and outcome without removing working capability.
 */
export default function BusinessAdminPage() {
  return (
    <>
      <BusinessContextSwitcher />
      <div style={{ padding: '1rem' }}>
        <Link href="/business">← Back to what Aureus is carrying</Link>
      </div>
      <BusinessConsoleHome />
      <div style={{ padding: '0 1rem 1rem' }}>
        <Link href="/business/setup">Create a business workspace</Link>
      </div>
      <BusinessMembersPanel />
      <BusinessOperationsPanel />
    </>
  );
}
