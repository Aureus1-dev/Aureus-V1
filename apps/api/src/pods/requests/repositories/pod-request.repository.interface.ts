import { PodRequest, PodRequestStatus, PodRequestType } from '@prisma/client';

export const POD_REQUEST_REPOSITORY = 'POD_REQUEST_REPOSITORY';

export interface CreateRequestInput {
  userId: string;
  type: PodRequestType;
  podId?: string;
  proposedPodName?: string;
  proposedPodDescription?: string;
  reason?: string;
  status?: PodRequestStatus;
  decidedById?: string;
  decidedAt?: Date;
}

export interface UpdateRequestInput {
  status?: PodRequestStatus;
  podId?: string;
  decidedById?: string;
  decidedAt?: Date;
}

export interface RequestQueryParams {
  page: number;
  limit: number;
  userId?: string;
  podId?: string;
  status?: PodRequestStatus;
}

export interface PaginatedRequests {
  data: PodRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface IPodRequestRepository {
  create(data: CreateRequestInput): Promise<PodRequest>;
  findById(id: string): Promise<PodRequest | null>;
  findAll(params: RequestQueryParams): Promise<PaginatedRequests>;
  update(id: string, data: UpdateRequestInput): Promise<PodRequest>;
}
