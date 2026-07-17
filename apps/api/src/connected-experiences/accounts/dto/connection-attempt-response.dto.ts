import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConnectedProviderType } from '@prisma/client';
import { ConnectedAccountResponseDto } from './connected-account-response.dto';

export class ConnectionAttemptResponseDto {
  @ApiProperty({ enum: ConnectedProviderType }) providerType: ConnectedProviderType;
  @ApiProperty({ enum: ['AVAILABLE', 'COMING_SOON'] }) status: 'AVAILABLE' | 'COMING_SOON';
  @ApiProperty() message: string;
  @ApiPropertyOptional({ type: ConnectedAccountResponseDto }) account?: ConnectedAccountResponseDto;
}
