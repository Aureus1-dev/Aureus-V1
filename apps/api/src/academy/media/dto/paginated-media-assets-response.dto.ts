import { ApiProperty } from '@nestjs/swagger';
import { MediaAssetResponseDto } from './media-asset-response.dto';

export class PaginatedMediaAssetsResponseDto {
  @ApiProperty({ type: [MediaAssetResponseDto] }) data: MediaAssetResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
