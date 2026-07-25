import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { MessageReportStatus } from '@prisma/client';

export class ResolveReportDto {
  @ApiProperty({ enum: [MessageReportStatus.RESOLVED, MessageReportStatus.DISMISSED] })
  @IsIn([MessageReportStatus.RESOLVED, MessageReportStatus.DISMISSED])
  status: MessageReportStatus;
}
