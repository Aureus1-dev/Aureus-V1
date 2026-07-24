import {
  CitySheetCategory,
  CitySheetEntry,
  CitySheetEntryStatus,
  CitySheetVerificationConfidence,
  CitySheetVerificationEvent,
  CitySheetVerificationEventType,
  CitySheetVerificationStatus,
  LaunchAreaScope,
} from '@prisma/client';

export const CITY_SHEET_ENTRY_REPOSITORY = 'CITY_SHEET_ENTRY_REPOSITORY';

export interface CreateCitySheetEntryInput {
  organizationName: string;
  category: CitySheetCategory;
  description: string;
  address?: string;
  serviceArea: string;
  launchScope?: LaunchAreaScope;
  phone?: string;
  website?: string;
  hours: string;
  eligibilityRequirements?: string;
  languagesSupported?: string[];
  accessibilityNotes?: string;
  cost?: string;
  requiredDocuments?: string[];
  referralRequired?: boolean;
  isEmergencyService?: boolean;
  isTestFixture?: boolean;
  sourceNotes?: string;
  createdById: string;
}

export interface UpdateCitySheetEntryInput {
  organizationName?: string;
  category?: CitySheetCategory;
  description?: string;
  address?: string | null;
  serviceArea?: string;
  launchScope?: LaunchAreaScope;
  phone?: string | null;
  website?: string | null;
  hours?: string;
  eligibilityRequirements?: string | null;
  languagesSupported?: string[];
  accessibilityNotes?: string | null;
  cost?: string | null;
  requiredDocuments?: string[];
  referralRequired?: boolean;
  isEmergencyService?: boolean;
  isTestFixture?: boolean;
  sourceNotes?: string | null;
  status?: CitySheetEntryStatus;
  verificationStatus?: CitySheetVerificationStatus;
  verificationConfidence?: CitySheetVerificationConfidence | null;
  lastVerifiedAt?: Date | null;
  verifiedById?: string | null;
  verificationNotes?: string | null;
  rejectionReason?: string | null;
  nextReviewDueAt?: Date | null;
}

export interface CitySheetEntryQueryParams {
  page: number;
  limit: number;
  q?: string;
  category?: CitySheetCategory;
  launchScope?: LaunchAreaScope;
  verificationStatus?: CitySheetVerificationStatus;
  status?: CitySheetEntryStatus;
}

export interface PaginatedCitySheetEntries {
  data: CitySheetEntry[];
  total: number;
  page: number;
  limit: number;
}

/** A checklist response as recorded on a verification event — a label snapshot (not just an itemId lookup) so history reads correctly even if the checklist item is later edited or retired. */
export interface ChecklistResponseRecord {
  itemId: string;
  label: string;
  confirmed: boolean;
  note?: string;
}

export interface CreateVerificationEventInput {
  citySheetEntryId: string;
  eventType: CitySheetVerificationEventType;
  previousStatus: CitySheetVerificationStatus;
  newStatus: CitySheetVerificationStatus;
  confidence?: CitySheetVerificationConfidence;
  notes?: string;
  checklistResponses?: ChecklistResponseRecord[];
  performedById: string;
}

export interface ICitySheetEntryRepository {
  create(data: CreateCitySheetEntryInput): Promise<CitySheetEntry>;
  setRef(id: string, citySheetRef: string): Promise<CitySheetEntry>;
  findById(id: string): Promise<CitySheetEntry | null>;
  findByRef(citySheetRef: string): Promise<CitySheetEntry | null>;
  findAll(params: CitySheetEntryQueryParams): Promise<PaginatedCitySheetEntries>;
  update(id: string, data: UpdateCitySheetEntryInput): Promise<CitySheetEntry>;

  /** Appends a permanent verification-event row. Never updates or deletes an existing event. */
  appendVerificationEvent(data: CreateVerificationEventInput): Promise<CitySheetVerificationEvent>;
  /** Full, ordered (oldest first) verification history for one entry. */
  listVerificationEvents(citySheetEntryId: string): Promise<CitySheetVerificationEvent[]>;
}
