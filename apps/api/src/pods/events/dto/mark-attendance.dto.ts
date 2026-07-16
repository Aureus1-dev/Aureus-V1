import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

/** Steward-only, after the fact. Never a performance metric anywhere it is surfaced (Founder Decision #5). */
export class MarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsBoolean()
  attended: boolean;
}
