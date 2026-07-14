import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SaveResourceDto, UpdateSavedResourceDto } from './dto/save-resource.dto';
import { SavedResourceResponseDto } from './dto/saved-resource-response.dto';
import {
  ISavedResourceRepository,
  SAVED_RESOURCE_REPOSITORY,
} from './repositories/saved-resource.repository.interface';

@Injectable()
export class SavedResourcesService {
  constructor(
    @Inject(SAVED_RESOURCE_REPOSITORY)
    private readonly repo: ISavedResourceRepository,
  ) {}

  async save(userId: string, dto: SaveResourceDto): Promise<SavedResourceResponseDto> {
    const existing = await this.repo.findOne(userId, dto.resourceId);
    if (existing) throw new ConflictException('Resource is already saved');

    const saved = await this.repo.save({ userId, ...dto });
    return SavedResourceResponseDto.fromEntity(saved);
  }

  async findByUser(userId: string): Promise<SavedResourceResponseDto[]> {
    const list = await this.repo.findByUser(userId);
    return list.map(SavedResourceResponseDto.fromEntity);
  }

  async update(
    userId: string, resourceId: string, dto: UpdateSavedResourceDto,
  ): Promise<SavedResourceResponseDto> {
    const existing = await this.repo.findOne(userId, resourceId);
    if (!existing) throw new NotFoundException('Saved resource not found');

    const updated = await this.repo.update(userId, resourceId, dto);
    return SavedResourceResponseDto.fromEntity(updated);
  }

  async remove(userId: string, resourceId: string): Promise<void> {
    const existing = await this.repo.findOne(userId, resourceId);
    if (!existing) throw new NotFoundException('Saved resource not found');
    await this.repo.remove(userId, resourceId);
  }
}
