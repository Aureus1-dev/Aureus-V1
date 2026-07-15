import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../../auth/auth-guards.module';
import { UserInterestsController } from './user-interests.controller';
import { UserInterestsService } from './user-interests.service';
import { PrismaUserInterestRepository } from './repositories/prisma-user-interest.repository';
import { USER_INTEREST_REPOSITORY } from './repositories/user-interest.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [UserInterestsController],
  providers: [
    UserInterestsService,
    { provide: USER_INTEREST_REPOSITORY, useClass: PrismaUserInterestRepository },
  ],
  exports: [UserInterestsService],
})
export class UserInterestsModule {}
