import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { CertificationResponseDto } from './dto/certification-response.dto';
import {
  CERTIFICATION_REPOSITORY,
  ICertificationRepository,
} from './repositories/certification.repository.interface';

@Injectable()
export class CertificationsService {
  constructor(@Inject(CERTIFICATION_REPOSITORY) private readonly repo: ICertificationRepository) {}

  async findMine(caller: AuthenticatedUser): Promise<CertificationResponseDto[]> {
    const certifications = await this.repo.findByUser(caller.id);
    return certifications.map(CertificationResponseDto.fromEntity);
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<CertificationResponseDto> {
    const certification = await this.repo.findById(id);
    if (!certification) throw new NotFoundException(`Certification '${id}' not found`);

    if (certification.userId !== caller.id && !hasRole(caller, ACADEMY_STAFF_ROLES)) {
      throw new ForbiddenException('You may only access your own certifications');
    }

    return CertificationResponseDto.fromEntity(certification);
  }
}
