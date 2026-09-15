import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ProposeGuardianChildRelationshipDto {
  @ApiProperty({ format: 'uuid', description: 'Existing Aureus member who must separately assent as the child principal' })
  @IsUUID()
  childUserId!: string;
}
