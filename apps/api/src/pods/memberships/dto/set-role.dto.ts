import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PodMemberRole } from '@prisma/client';

/** Institutional Appointment only (Founder Decision #2) — Admin-gated in the controller. */
export class SetRoleDto {
  @ApiProperty({ enum: PodMemberRole })
  @IsEnum(PodMemberRole)
  role: PodMemberRole;
}
