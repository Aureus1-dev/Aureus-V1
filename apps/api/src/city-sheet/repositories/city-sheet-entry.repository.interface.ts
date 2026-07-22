import {
  CitySheetCategory,
  CitySheetEntry,
  CitySheetEntryStatus,
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
  status?: CitySheetEntryStatus;
  verificationStatus?: CitySheetVerificationStatus;
  lastVerifiedAt?: Date | null;
  verifiedById?: string | null;
  verificationNotes?: string | null;
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

export interface ICitySheetEntryRepository {
  create(data: CreateCitySheetEntryInput): Promise<CitySheetEntry>;
  setRef(id: string, citySheetRef: string): Promise<CitySheetEntry>;
  findById(id: string): Promise<CitySheetEntry | null>;
  findByRef(citySheetRef: string): Promise<CitySheetEntry | null>;
  findAll(params: CitySheetEntryQueryParams): Promise<PaginatedCitySheetEntries>;
  update(id: string, data: UpdateCitySheetEntryInput): Promise<CitySheetEntry>;
}
