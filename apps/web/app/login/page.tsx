import { LoginForm } from '../../design-system/components/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return <LoginForm sessionExpired={expired === '1'} />;
}
