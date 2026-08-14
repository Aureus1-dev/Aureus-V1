import { PublicWardExperience } from '../../../design-system/components/public-ward';
import { KitchenBathIntakePanel } from '../../../design-system/components/public-ward/KitchenBathIntakePanel';

export default async function PublicWardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <PublicWardExperience slug={slug} />
      <KitchenBathIntakePanel slug={slug} />
    </>
  );
}
