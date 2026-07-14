import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaProfileRepository } from './repositories/prisma-profile.repository';
import { PROFILE_REPOSITORY } from './repositories/profile.repository.interface';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, { provide: PROFILE_REPOSITORY, useClass: PrismaProfileRepository }],
  exports: [ProfileService],
})
export class ProfileModule {}
