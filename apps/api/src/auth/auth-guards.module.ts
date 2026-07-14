import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

/**
 * Provides JwtAuthGuard's passport strategy and RolesGuard without depending
 * on UsersModule/AuthService. Kept separate from AuthModule so any module
 * that needs to protect its routes (Users, Opportunities, ...) can import
 * this without creating a circular dependency with AuthModule (which itself
 * depends on UsersModule for credential lookup).
 */
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, RolesGuard],
  exports: [RolesGuard, PassportModule],
})
export class AuthGuardsModule {}
