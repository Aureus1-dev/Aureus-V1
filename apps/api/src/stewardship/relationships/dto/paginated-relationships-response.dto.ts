import { ApiProperty } from '@nestjs/swagger';
import { RelationshipResponseDto } from './relationship-response.dto';

export class PaginatedRelationshipsResponseDto {
  @ApiProperty({ type: [RelationshipResponseDto] }) data: RelationshipResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
