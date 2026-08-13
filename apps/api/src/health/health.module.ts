import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AiProviderModule } from '../ai/providers/ai-provider.module';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { AiProviderHealthIndicator } from './ai-provider-health.indicator';

@Module({
  imports: [TerminusModule, AiProviderModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, AiProviderHealthIndicator],
})
export class HealthModule {}
