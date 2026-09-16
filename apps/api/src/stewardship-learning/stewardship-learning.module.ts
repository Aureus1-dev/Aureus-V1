import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { StewardshipLearningController } from './stewardship-learning.controller';
import { StewardshipLearningService } from './stewardship-learning.service';

@Module({
  imports: [AuthGuardsModule],
  controllers: [StewardshipLearningController],
  providers: [StewardshipLearningService],
  exports: [StewardshipLearningService],
})
export class StewardshipLearningModule {}
