import { ApiProperty } from '@nestjs/swagger';
import type { Certification } from '@prisma/client';

export class CertificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() courseId: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-CERT-000001', nullable: true })
  certificateRef: string | null;
  @ApiProperty() issuedAt: Date;

  static fromEntity(c: Certification): CertificationResponseDto {
    const dto = new CertificationResponseDto();
    Object.assign(dto, c);
    return dto;
  }
}
