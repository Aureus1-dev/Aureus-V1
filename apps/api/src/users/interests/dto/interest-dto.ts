import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OpportunityCategory, UserInterest } from '@prisma/client';

export class AddInterestDto {
  @ApiProperty({ enum: OpportunityCategory })
  @IsEnum(OpportunityCategory)
  category: OpportunityCategory;
}

export class InterestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: OpportunityCategory }) category: OpportunityCategory;
  @ApiProperty() createdAt: Date;

  static fromEntity(i: UserInterest): InterestResponseDto {
    const dto = new InterestResponseDto();
    Object.assign(dto, i);
    return dto;
  }
}
