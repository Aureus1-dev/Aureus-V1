import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AddCourseMediaDto {
  @ApiProperty() @IsUUID() mediaAssetId: string;

  @ApiPropertyOptional({ description: 'Attach to a specific lesson within the course, rather than the course as a whole' })
  @IsOptional() @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional() @IsInt() @Min(0)
  position?: number;
}
