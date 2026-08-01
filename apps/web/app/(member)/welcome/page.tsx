import { WelcomeFlow } from '../../../design-system/components/welcome';

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ newMission?: string; need?: string }>;
}) {
  const { newMission, need } = await searchParams;
  return <WelcomeFlow forceNewMission={newMission === 'true'} initialNeed={need} />;
}
