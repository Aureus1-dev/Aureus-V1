import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NeedsService } from './needs.service';
import { StatedNeedResponseDto } from './dto/stated-need-response.dto';

@ApiTags('needs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('needs')
export class NeedsController {
  constructor(private readonly service: NeedsService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's own stated needs (Gate C — C1: Understanding)" })
  @ApiResponse({ status: 200, type: [StatedNeedResponseDto] })
  findMine(@CurrentUser() caller: AuthenticatedUser): Promise<StatedNeedResponseDto[]> {
    return this.service.findMine(caller.id);
  }
}
