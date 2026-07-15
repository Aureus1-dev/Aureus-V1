import { ApiProperty } from '@nestjs/swagger';
import { OrganizationResponseDto } from './organization-response.dto';

export class PaginatedOrganizationsResponseDto {
  @ApiProperty({ type: [OrganizationResponseDto] }) data: OrganizationResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
