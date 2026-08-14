import { apiRequest } from './http';

export interface RedeemedWardContinuation {
  conversationId: string;
  accessToken: string;
  tokenExpiresAt: string;
  notice: string;
}

export function redeemWardContinuation(
  slug: string,
  continuationToken: string,
): Promise<RedeemedWardContinuation> {
  return apiRequest(
    `/public/wards/${encodeURIComponent(slug)}/telephony/continuations/redeem`,
    {
      method: 'POST',
      retryOn401: false,
      body: { continuationToken },
    },
  );
}
