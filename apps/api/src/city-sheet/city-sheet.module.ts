import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CitySheetController } from './city-sheet.controller';
import { CitySheetService } from './city-sheet.service';
import { PrismaCitySheetEntryRepository } from './repositories/prisma-city-sheet-entry.repository';
import { CITY_SHEET_ENTRY_REPOSITORY } from './repositories/city-sheet-entry.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [CitySheetController],
  providers: [
    CitySheetService,
    { provide: CITY_SHEET_ENTRY_REPOSITORY, useClass: PrismaCitySheetEntryRepository },
  ],
  exports: [CitySheetService, CITY_SHEET_ENTRY_REPOSITORY],
})
export class CitySheetModule {}
