import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GrantConsentDto {
  @ApiProperty({ description: 'The consent/copy version the member is agreeing to (see CURRENT_CONSENT_VERSION).' })
  @IsString() @IsNotEmpty()
  version: string;
}
