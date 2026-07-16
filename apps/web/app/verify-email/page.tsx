import { VerifyEmailStatus } from '../../design-system/components/auth';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailStatus token={token ?? null} />;
}
