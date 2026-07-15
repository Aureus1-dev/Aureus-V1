import { MediaAsset, MediaType } from '@prisma/client';

export const MEDIA_ASSET_REPOSITORY = 'MEDIA_ASSET_REPOSITORY';

export interface CreateMediaAssetInput {
  type: MediaType;
  title: string;
  description?: string;
  storageRef: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  uploadedById: string;
}

export interface UpdateMediaAssetInput {
  title?: string;
  description?: string | null;
  storageRef?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
}

export interface MediaAssetQueryParams {
  page: number;
  limit: number;
  q?: string;
  type?: MediaType;
  uploadedById?: string;
}

export interface PaginatedMediaAssets {
  data: MediaAsset[];
  total: number;
  page: number;
  limit: number;
}

export interface IMediaAssetRepository {
  create(data: CreateMediaAssetInput): Promise<MediaAsset>;
  setRef(id: string, mediaRef: string): Promise<MediaAsset>;
  findById(id: string): Promise<MediaAsset | null>;
  findByRef(mediaRef: string): Promise<MediaAsset | null>;
  findAll(params: MediaAssetQueryParams): Promise<PaginatedMediaAssets>;
  update(id: string, data: UpdateMediaAssetInput): Promise<MediaAsset>;
  softDelete(id: string): Promise<MediaAsset>;
}
