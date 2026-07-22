import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { CitySheetController } from './city-sheet.controller';
import { CitySheetService } from './city-sheet.service';
import { PrismaCitySheetEntryRepository } from './repositories/prisma-city-sheet-entry.repository';
import { CITY_SHEET_ENTRY_REPOSITORY } from './repositories/city-sheet-entry.repository.interface';
import { ChecklistItemsController } from './checklist/checklist-items.controller';
import { ChecklistItemsService } from './checklist/checklist-items.service';
import { PrismaChecklistItemRepository } from './checklist/repositories/prisma-checklist-item.repository';
import { CHECKLIST_ITEM_REPOSITORY } from './checklist/repositories/checklist-item.repository.interface';

@Module({
  imports: [AuthGuardsModule],
  controllers: [CitySheetController, ChecklistItemsController],
  providers: [
    CitySheetService,
    { provide: CITY_SHEET_ENTRY_REPOSITORY, useClass: PrismaCitySheetEntryRepository },
    ChecklistItemsService,
    { provide: CHECKLIST_ITEM_REPOSITORY, useClass: PrismaChecklistItemRepository },
  ],
  exports: [CitySheetService, CITY_SHEET_ENTRY_REPOSITORY, ChecklistItemsService, CHECKLIST_ITEM_REPOSITORY],
})
export class CitySheetModule {}
