import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PublicWardController } from './public-ward.controller';
import { PublicWardService } from './public-ward.service';

@Module({
  imports: [AiModule],
  controllers: [PublicWardController],
  providers: [PublicWardService],
  exports: [PublicWardService],
})
export class PublicWardModule {}
