import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { CertificationsService } from './certifications.service';
import { CertificationResponseDto } from './dto/certification-response.dto';

@ApiTags('academy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('academy/certifications')
export class CertificationsController {
  constructor(private readonly service: CertificationsService) {}

  @Get('me')
  @ApiOperation({ summary: "List the caller's certifications" })
  @ApiResponse({ status: 200, type: [CertificationResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<CertificationResponseDto[]> {
    return this.service.findMine(caller);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a certification by UUID (owner, Steward, or Admin)' })
  @ApiParam({ name: 'id', description: 'Certification UUID' })
  @ApiResponse({ status: 200, type: CertificationResponseDto })
  @ApiResponse({ status: 403, description: 'Caller does not own this certification or hold a moderation role' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<CertificationResponseDto> {
    return this.service.findById(id, caller);
  }
}
