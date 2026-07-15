import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { MediaAsset } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { ListMediaAssetsQueryDto } from './dto/list-media-assets-query.dto';
import { MediaAssetResponseDto } from './dto/media-asset-response.dto';
import { PaginatedMediaAssetsResponseDto } from './dto/paginated-media-assets-response.dto';
import {
  IMediaAssetRepository,
  MEDIA_ASSET_REPOSITORY,
} from './repositories/media-asset.repository.interface';

@Injectable()
export class MediaAssetsService {
  private readonly logger = new Logger(MediaAssetsService.name);

  constructor(@Inject(MEDIA_ASSET_REPOSITORY) private readonly repo: IMediaAssetRepository) {}

  async create(dto: CreateMediaAssetDto, caller: AuthenticatedUser): Promise<MediaAssetResponseDto> {
    const asset = await this.repo.create({ ...dto, uploadedById: caller.id });

    const mediaRef = `AUR-MED-${asset.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(asset.id, mediaRef);

    this.logger.log(`Media asset created: ${mediaRef} by ${caller.id}`);
    return MediaAssetResponseDto.fromEntity(updated);
  }

  async findAll(query: ListMediaAssetsQueryDto): Promise<PaginatedMediaAssetsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({
      page, limit, q: query.q, type: query.type, uploadedById: query.uploadedById,
    });

    return {
      data: result.data.map(MediaAssetResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<MediaAssetResponseDto> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundException(`Media asset '${id}' not found`);
    return MediaAssetResponseDto.fromEntity(asset);
  }

  async findByRef(mediaRef: string): Promise<MediaAssetResponseDto> {
    const asset = await this.repo.findByRef(mediaRef);
    if (!asset) throw new NotFoundException(`Media asset '${mediaRef}' not found`);
    return MediaAssetResponseDto.fromEntity(asset);
  }

  async update(id: string, dto: UpdateMediaAssetDto, caller: AuthenticatedUser): Promise<MediaAssetResponseDto> {
    await this.getOwnedOrThrow(id, caller);
    const updated = await this.repo.update(id, dto);
    this.logger.log(`Media asset updated: ${updated.mediaRef ?? id} by ${caller.id}`);
    return MediaAssetResponseDto.fromEntity(updated);
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
    this.logger.log(`Media asset soft-deleted: ${existing.mediaRef ?? id} by ${caller.id}`);
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<MediaAsset> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundException(`Media asset '${id}' not found`);

    if (asset.uploadedById !== caller.id && !hasRole(caller, ACADEMY_STAFF_ROLES)) {
      throw new ForbiddenException('You do not have permission to manage this media asset');
    }

    return asset;
  }
}
