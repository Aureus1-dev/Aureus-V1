import { PublicWardExperience } from '../../../../design-system/components/public-ward';

export default async function EmbeddedWardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicWardExperience slug={slug} embedded />;
}
