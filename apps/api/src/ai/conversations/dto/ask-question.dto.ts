import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AskQuestionDto {
  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString() @MinLength(1) @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({
    maxLength: 2000,
    description:
      "A description of what is currently visible on the member's screen (registered Highlight Registry targets, open panels), so the steward can safely reference them by id when using an interface tool. Mirrors the voice modality's syncInterfaceContext (DOMAIN-005).",
  })
  @IsOptional() @IsString() @MaxLength(2000)
  interfaceContext?: string;
}
