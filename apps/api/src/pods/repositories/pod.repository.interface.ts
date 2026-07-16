import { Pod, PodStatus, PodType } from '@prisma/client';

export const POD_REPOSITORY = 'POD_REPOSITORY';

export interface CreatePodInput {
  name: string;
  shortDescription: string;
  fullDescription: string;
  type: PodType;
  primaryLanguage?: string;
  city?: string;
  region?: string;
  stateProvince?: string;
  country?: string;
  capacity?: number;
  parentPodId?: string;
  createdById: string;
}

export interface UpdatePodInput {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
  primaryLanguage?: string | null;
  city?: string | null;
  region?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  capacity?: number;
  dormancyThresholdDays?: number;
  status?: PodStatus;
}

export interface PodQueryParams {
  page: number;
  limit: number;
  q?: string;
  type?: PodType;
  status?: PodStatus;
}

export interface PaginatedPods {
  data: Pod[];
  total: number;
  page: number;
  limit: number;
}

export interface IPodRepository {
  create(data: CreatePodInput): Promise<Pod>;
  setRef(id: string, podRef: string): Promise<Pod>;
  findById(id: string): Promise<Pod | null>;
  findByRef(podRef: string): Promise<Pod | null>;
  findAll(params: PodQueryParams): Promise<PaginatedPods>;
  update(id: string, data: UpdatePodInput): Promise<Pod>;
}
