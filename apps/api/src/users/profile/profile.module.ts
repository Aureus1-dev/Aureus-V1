import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../../auth/auth-guards.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaProfileRepository } from './repositories/prisma-profile.repository';
import { PROFILE_REPOSITORY } from './repositories/profile.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [ProfileController],
  providers: [ProfileService, { provide: PROFILE_REPOSITORY, useClass: PrismaProfileRepository }],
  // Pods (WO-030) matching needs graceful "no profile yet" reads (repository
  // returns null; ProfileService.findByUserId throws NotFoundException),
  // so the repository token is exported alongside the service.
  exports: [ProfileService, PROFILE_REPOSITORY],
})
export class ProfileModule {}
