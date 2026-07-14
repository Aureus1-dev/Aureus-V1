import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RoleActionDto {
  @ApiProperty({ enum: UserRole, example: UserRole.STEWARD })
  @IsEnum(UserRole)
  role: UserRole;
}
