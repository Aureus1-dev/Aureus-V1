import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { InstitutionalMemoryService } from './institutional-memory.service';
import { InstitutionalMemoryResponseDto } from './dto/institutional-memory-response.dto';

/**
 * Exposes `InstitutionalMemoryService.assembleContext()` — previously
 * internal-only, used to feed the AI Orchestrator's own prompts — as a
 * read-only member-facing endpoint, so the Living Steward Workspace's
 * right-hand context panel ("Recent Memory") can show the same context
 * bundle the AI itself already reasons from. Deliberately no `:id`
 * parameter: a caller can only ever read their own memory, never
 * another member's — that is structural here, not a runtime check.
 */
@ApiTags('memory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memory')
export class InstitutionalMemoryController {
  constructor(private readonly service: InstitutionalMemoryService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated caller's own institutional memory (read-only)" })
  @ApiResponse({ status: 200, type: InstitutionalMemoryResponseDto })
  getMine(@CurrentUser() caller: AuthenticatedUser): Promise<InstitutionalMemoryResponseDto> {
    return this.service.assembleContext(caller);
  }
}
