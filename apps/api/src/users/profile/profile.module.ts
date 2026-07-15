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
  exports: [ProfileService],
})
export class ProfileModule {}
