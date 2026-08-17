import Link from 'next/link';
import {
  BusinessConsoleHome,
  BusinessOperationsPanel,
} from '../../../design-system/components/business-console';

export default function BusinessPage() {
  return (
    <>
      <BusinessConsoleHome />
      <div style={{ padding: '0 1rem 1rem' }}>
        <Link href="/business/setup">Create or connect a business workspace</Link>
      </div>
      <BusinessOperationsPanel />
    </>
  );
}
