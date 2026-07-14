import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ListMilestonesQueryDto } from './dto/list-milestones-query.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { PaginatedMilestonesResponseDto } from './dto/paginated-milestones-response.dto';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from './repositories/milestone.repository.interface';

@Injectable()
export class MilestonesService {
  constructor(@Inject(MILESTONE_REPOSITORY) private readonly repo: IMilestoneRepository) {}

  async create(dto: CreateMilestoneDto): Promise<MilestoneResponseDto> {
    return MilestoneResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findAll(query: ListMilestonesQueryDto): Promise<PaginatedMilestonesResponseDto> {
    const page = query.page ?? 1; const limit = query.limit ?? 20;
    const result = await this.repo.findAll({ page, limit, journeyId: query.journeyId, status: query.status });
    return {
      data: result.data.map(MilestoneResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<MilestoneResponseDto> {
    const m = await this.repo.findById(id);
    if (!m) throw new NotFoundException(`Milestone '${id}' not found`);
    return MilestoneResponseDto.fromEntity(m);
  }

  async update(id: string, dto: UpdateMilestoneDto): Promise<MilestoneResponseDto> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Milestone '${id}' not found`);
    return MilestoneResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string): Promise<void> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Milestone '${id}' not found`);
    await this.repo.softDelete(id);
  }
}
