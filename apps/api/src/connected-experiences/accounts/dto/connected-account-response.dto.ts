import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConnectedAccountStatus, ConnectedProviderType } from '@prisma/client';
import type { ConnectedAccount } from '@prisma/client';

export class ConnectedAccountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: ConnectedProviderType }) providerType: ConnectedProviderType;
  @ApiProperty({ enum: ConnectedAccountStatus }) status: ConnectedAccountStatus;
  @ApiProperty({ type: [String] }) grantedScopes: string[];
  @ApiPropertyOptional({ nullable: true }) externalAccountRef: string | null;
  @ApiProperty() connectedAt: Date;
  @ApiPropertyOptional({ nullable: true }) revokedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(account: ConnectedAccount): ConnectedAccountResponseDto {
    const dto = new ConnectedAccountResponseDto();
    Object.assign(dto, account);
    return dto;
  }
}
