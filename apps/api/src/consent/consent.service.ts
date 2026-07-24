import { Inject, Injectable } from '@nestjs/common';
import { ConsentStatusResponseDto } from './dto/consent-status-response.dto';
import { GrantConsentDto } from './dto/grant-consent.dto';
import { CONSENT_REPOSITORY, IConsentRepository } from './repositories/consent.repository.interface';

@Injectable()
export class ConsentService {
  constructor(@Inject(CONSENT_REPOSITORY) private readonly repo: IConsentRepository) {}

  async grant(userId: string, dto: GrantConsentDto): Promise<ConsentStatusResponseDto> {
    await this.repo.grant({ userId, version: dto.version });
    return this.getStatus(userId);
  }

  async getStatus(userId: string): Promise<ConsentStatusResponseDto> {
    const latest = await this.repo.findLatestByUser(userId);
    return ConsentStatusResponseDto.fromLatest(latest);
  }
}
