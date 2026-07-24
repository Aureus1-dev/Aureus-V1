import { NeedResourcesPage } from '../../../../design-system/components/needs/NeedResourcesPage';

export default async function NeedResourcesRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NeedResourcesPage needId={id} />;
}
