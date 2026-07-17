import { Controller, HttpCode, HttpStatus, Param, ParseEnumPipe, Post, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConnectedProviderType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ConnectedAccountsService } from './connected-accounts.service';
import { ConnectionAttemptResponseDto } from './dto/connection-attempt-response.dto';
import { ProviderCatalogItemResponseDto } from './dto/provider-catalog-item-response.dto';

@ApiTags('connected-experiences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connected-accounts')
export class ConnectedAccountsController {
  constructor(private readonly service: ConnectedAccountsService) {}

  @Get()
  @ApiOperation({ summary: "List the full provider catalog merged with the caller's own connection status (self only)" })
  @ApiResponse({ status: 200, type: [ProviderCatalogItemResponseDto] })
  listCatalog(@CurrentUser() caller: AuthenticatedUser): Promise<ProviderCatalogItemResponseDto[]> {
    return this.service.listCatalog(caller);
  }

  @Post(':providerType/connect')
  @ApiOperation({
    summary: 'Attempt to connect a provider (self only). Never fabricates success: reports Coming Soon honestly when no real adapter is configured.',
  })
  @ApiParam({ name: 'providerType', enum: ConnectedProviderType })
  @ApiResponse({ status: 201, type: ConnectionAttemptResponseDto })
  connect(
    @Param('providerType', new ParseEnumPipe(ConnectedProviderType)) providerType: ConnectedProviderType,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<ConnectionAttemptResponseDto> {
    return this.service.connect(providerType, caller);
  }

  @Post(':providerType/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an active provider connection (self only)' })
  @ApiParam({ name: 'providerType', enum: ConnectedProviderType })
  @ApiResponse({ status: 404, description: 'No active connection to revoke' })
  revoke(
    @Param('providerType', new ParseEnumPipe(ConnectedProviderType)) providerType: ConnectedProviderType,
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<void> {
    return this.service.revoke(providerType, caller);
  }
}
