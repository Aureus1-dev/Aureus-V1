import { KitchenBathIntakePanel } from '../../../design-system/components/public-ward/KitchenBathIntakePanel';
import { PublicWardContinuationGate } from '../../../design-system/components/public-ward/PublicWardContinuationGate';

export default async function PublicWardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ continue?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const continuationToken = typeof query.continue === 'string' ? query.continue : undefined;
  return (
    <>
      <PublicWardContinuationGate slug={slug} continuationToken={continuationToken} />
      <KitchenBathIntakePanel slug={slug} />
    </>
  );
}
