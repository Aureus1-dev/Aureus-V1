import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alice Johnson', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Software engineer passionate about learning', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional() @IsUrl()
  avatarUrl?: string;
}
