import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { UsersModule } from '../users/users.module';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';

/**
 * Administration & Operations (PA-020). Starts with role management
 * (WO-021); future administrative capabilities (system configuration,
 * moderation oversight, access reviews per OAS-SEC-003) extend this module
 * rather than being scattered across domain modules.
 */
@Module({
  imports: [AuthGuardsModule, UsersModule],
  controllers: [UserRolesController],
  providers: [UserRolesService],
})
export class AdministrationModule {}
