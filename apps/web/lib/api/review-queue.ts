import { apiRequest } from './http';

/**
 * A thin unification layer over five independently-designed verification
 * workflows (Resources, Organizations, Opportunities, Knowledge, Academy)
 * that all share the same DRAFT → PENDING_REVIEW → VERIFIED/REJECTED shape
 * (FPB-009 §8). Deliberately projects each domain's response DTO down to
 * the four fields the Founder Operating System's Review Queue panel
 * (PR-003) actually needs, rather than importing five separate full DTO
 * shapes for one shared list view.
 */
export type ReviewDomain = 'resources' | 'organizations' | 'opportunities' | 'knowledge' | 'academy';

export interface PendingReviewItemDto {
  id: string;
  domain: ReviewDomain;
  title: string;
  createdAt: string;
}

interface RawReviewItem {
  id: string;
  title?: string;
  name?: string;
  createdAt: string;
}

interface RawPaginated {
  data: RawReviewItem[];
  total: number;
}

const DOMAIN_PATH: Record<ReviewDomain, string> = {
  resources: '/resources',
  organizations: '/organizations',
  opportunities: '/opportunities',
  knowledge: '/knowledge/articles',
  academy: '/academy/courses',
};

export async function listPendingReview(
  accessToken: string,
  domain: ReviewDomain,
): Promise<{ items: PendingReviewItemDto[]; total: number }> {
  const result = await apiRequest<RawPaginated>(
    `${DOMAIN_PATH[domain]}?verificationStatus=PENDING_REVIEW&limit=50`,
    { accessToken },
  );
  return {
    total: result.total,
    items: result.data.map((item) => ({
      id: item.id,
      domain,
      title: item.title ?? item.name ?? '(untitled)',
      createdAt: item.createdAt,
    })),
  };
}

/**
 * Opportunities alone requires the reviewer's own UUID in the request body
 * (`reviewedById`) rather than inferring it from the caller's access token —
 * a pre-existing asymmetry in that domain's verification endpoints, not
 * something this client can paper over without changing backend contracts.
 */
export function verifyPendingReview(
  accessToken: string,
  domain: ReviewDomain,
  id: string,
  reviewerId: string,
): Promise<void> {
  const body = domain === 'opportunities' ? { reviewedById: reviewerId } : undefined;
  return apiRequest<void>(`${DOMAIN_PATH[domain]}/${id}/verify`, { method: 'POST', accessToken, body });
}

export function rejectPendingReview(
  accessToken: string,
  domain: ReviewDomain,
  id: string,
  rejectionReason: string,
  reviewerId: string,
): Promise<void> {
  const body =
    domain === 'opportunities' ? { rejectionReason, reviewedById: reviewerId } : { rejectionReason };
  return apiRequest<void>(`${DOMAIN_PATH[domain]}/${id}/reject`, { method: 'POST', accessToken, body });
}
