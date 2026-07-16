import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ServiceProjectStatus } from '@prisma/client';
import type { PodServiceProject } from '@prisma/client';

export class CreateServiceProjectDto {
  @ApiProperty({ minLength: 3 })
  @IsString() @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Who needs us? A local food pantry needs weekend volunteers.' })
  @IsString() @MinLength(10)
  description: string;
}

export class UpdateServiceProjectDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(3)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(10)
  description?: string;
}

export class UpdateServiceProjectStatusDto {
  @ApiProperty({ enum: ServiceProjectStatus })
  @IsEnum(ServiceProjectStatus)
  status: ServiceProjectStatus;
}

export class ServiceProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() podId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty({ enum: ServiceProjectStatus }) status: ServiceProjectStatus;
  @ApiProperty() proposedById: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(p: PodServiceProject): ServiceProjectResponseDto {
    const dto = new ServiceProjectResponseDto();
    Object.assign(dto, p);
    return dto;
  }
}
