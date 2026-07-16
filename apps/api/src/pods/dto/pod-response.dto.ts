import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PodStatus, PodType } from '@prisma/client';
import type { Pod } from '@prisma/client';

export class PodResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ description: 'Stable human-readable ID, e.g. AUR-POD-000001', nullable: true }) podRef: string | null;
  @ApiProperty() name: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() fullDescription: string;
  @ApiProperty({ enum: PodType }) type: PodType;
  @ApiProperty({ enum: PodStatus }) status: PodStatus;
  @ApiProperty() capacity: number;
  @ApiPropertyOptional({ nullable: true }) primaryLanguage: string | null;
  @ApiPropertyOptional({ nullable: true }) city: string | null;
  @ApiPropertyOptional({ nullable: true }) region: string | null;
  @ApiPropertyOptional({ nullable: true }) stateProvince: string | null;
  @ApiPropertyOptional({ nullable: true }) country: string | null;
  @ApiProperty() dormancyThresholdDays: number;
  @ApiPropertyOptional({ nullable: true, description: 'Stewardship Origin — institutional memory only, never hierarchy or ownership' })
  parentPodId: string | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(p: Pod): PodResponseDto {
    const dto = new PodResponseDto();
    Object.assign(dto, p);
    return dto;
  }
}
