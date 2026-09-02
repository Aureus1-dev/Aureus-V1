import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateResponsibilityDto {
  @ApiProperty({
    description: 'Existing member-owned AI conversation where this Responsibility originated',
    format: 'uuid',
  })
  @IsUUID()
  conversationId!: string;

  @ApiProperty({
    description: 'Existing VERIFIED + ACTIVE Opportunity the member is deciding how to pursue',
    format: 'uuid',
  })
  @IsUUID()
  opportunityId!: string;
}
