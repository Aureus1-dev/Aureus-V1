import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OpportunityCategory } from '@prisma/client';
import { AddInterestDto, InterestResponseDto } from './dto/interest-dto';
import {
  IUserInterestRepository,
  USER_INTEREST_REPOSITORY,
} from './repositories/user-interest.repository.interface';

@Injectable()
export class UserInterestsService {
  constructor(
    @Inject(USER_INTEREST_REPOSITORY)
    private readonly repo: IUserInterestRepository,
  ) {}

  async add(userId: string, dto: AddInterestDto): Promise<InterestResponseDto> {
    if (await this.repo.exists(userId, dto.category)) {
      throw new ConflictException(`Interest in '${dto.category}' already exists`);
    }
    return InterestResponseDto.fromEntity(await this.repo.add(userId, dto.category));
  }

  async findByUser(userId: string): Promise<InterestResponseDto[]> {
    return (await this.repo.findByUser(userId)).map(InterestResponseDto.fromEntity);
  }

  async remove(userId: string, category: OpportunityCategory): Promise<void> {
    if (!await this.repo.exists(userId, category)) {
      throw new NotFoundException(`Interest in '${category}' not found`);
    }
    await this.repo.remove(userId, category);
  }
}
