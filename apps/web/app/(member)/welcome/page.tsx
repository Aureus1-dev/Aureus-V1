import { WelcomeFlow } from '../../../design-system/components/welcome';

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ newMission?: string }>;
}) {
  const { newMission } = await searchParams;
  return <WelcomeFlow forceNewMission={newMission === 'true'} />;
}
