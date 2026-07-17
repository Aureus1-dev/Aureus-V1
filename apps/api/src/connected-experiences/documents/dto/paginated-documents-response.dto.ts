import { ApiProperty } from '@nestjs/swagger';
import { DocumentResponseDto } from './document-response.dto';

export class PaginatedDocumentsResponseDto {
  @ApiProperty({ type: [DocumentResponseDto] }) data: DocumentResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
