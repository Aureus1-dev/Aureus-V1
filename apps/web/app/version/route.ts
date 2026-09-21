import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      service: 'web',
      commit: process.env.RENDER_GIT_COMMIT ?? process.env.AUREUS_COMMIT_SHA ?? null,
      serviceId: process.env.RENDER_SERVICE_ID ?? null,
      instanceId: process.env.RENDER_INSTANCE_ID ?? null,
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    },
  );
}
