import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { JourneyResponseDto } from './dto/journey-response.dto';
import { JOURNEY_REPOSITORY, IJourneyRepository } from './repositories/journey.repository.interface';

@Injectable()
export class JourneysService {
  constructor(@Inject(JOURNEY_REPOSITORY) private readonly repo: IJourneyRepository) {}

  async create(dto: CreateJourneyDto): Promise<JourneyResponseDto> {
    const existing = await this.repo.findByGoalId(dto.goalId);
    if (existing) throw new ConflictException(`Goal '${dto.goalId}' already has a Journey`);
    return JourneyResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findById(id: string): Promise<JourneyResponseDto> {
    const j = await this.repo.findById(id);
    if (!j) throw new NotFoundException(`Journey '${id}' not found`);
    return JourneyResponseDto.fromEntity(j);
  }

  async findByGoalId(goalId: string): Promise<JourneyResponseDto> {
    const j = await this.repo.findByGoalId(goalId);
    if (!j) throw new NotFoundException(`No Journey found for Goal '${goalId}'`);
    return JourneyResponseDto.fromEntity(j);
  }

  async update(id: string, dto: UpdateJourneyDto): Promise<JourneyResponseDto> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Journey '${id}' not found`);
    return JourneyResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string): Promise<void> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Journey '${id}' not found`);
    await this.repo.softDelete(id);
  }
}
