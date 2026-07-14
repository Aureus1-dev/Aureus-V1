import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { IProfileRepository, PROFILE_REPOSITORY } from './repositories/profile.repository.interface';

@Injectable()
export class ProfileService {
  constructor(@Inject(PROFILE_REPOSITORY) private readonly repo: IProfileRepository) {}

  async createOrGet(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) throw new ConflictException(`Profile for user '${userId}' already exists`);
    return ProfileResponseDto.fromEntity(await this.repo.create({ userId, ...dto }));
  }

  async findByUserId(userId: string): Promise<ProfileResponseDto> {
    const p = await this.repo.findByUserId(userId);
    if (!p) throw new NotFoundException(`Profile for user '${userId}' not found`);
    return ProfileResponseDto.fromEntity(p);
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    if (!await this.repo.findByUserId(userId))
      throw new NotFoundException(`Profile for user '${userId}' not found`);
    return ProfileResponseDto.fromEntity(await this.repo.update(userId, dto));
  }

  async remove(userId: string): Promise<void> {
    if (!await this.repo.findByUserId(userId))
      throw new NotFoundException(`Profile for user '${userId}' not found`);
    await this.repo.softDelete(userId);
  }
}
