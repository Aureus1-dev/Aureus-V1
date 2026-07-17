import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConnectedProviderType } from '@prisma/client';
import { ConnectedProviderCategory } from '../../common/connected-providers.catalog';
import { ConnectedAccountResponseDto } from './connected-account-response.dto';

export type ProviderConnectionState = 'CONNECTED' | 'NOT_CONNECTED' | 'COMING_SOON';

/**
 * One entry in the Connected Experiences home view: the fixed catalog
 * answers to the member's four questions (what/why/what the Steward can
 * do) plus this specific member's live connection state, so the frontend
 * never needs to separately fetch and merge two lists.
 */
export class ProviderCatalogItemResponseDto {
  @ApiProperty({ enum: ConnectedProviderType }) providerType: ConnectedProviderType;
  @ApiProperty() displayName: string;
  @ApiProperty() category: ConnectedProviderCategory;
  @ApiProperty() whatAureusCanAccess: string;
  @ApiProperty() whyItsNeeded: string;
  @ApiProperty() whatTheAiStewardCanDo: string;
  @ApiProperty({ enum: ['CONNECTED', 'NOT_CONNECTED', 'COMING_SOON'] }) connectionState: ProviderConnectionState;
  @ApiPropertyOptional({ type: ConnectedAccountResponseDto }) account?: ConnectedAccountResponseDto;
}
