import { apiRequest } from './http';

/**
 * A4 engineering (Human Steward Verification Workflow, frontend half).
 * DTO shapes mirror `apps/api/src/city-sheet/dto/*` exactly. This client
 * never performs verification itself — it only carries a Human Steward's
 * own decisions (confidence, notes, checklist answers) to the backend,
 * which is the only place a `CitySheetEntry.verificationStatus` actually
 * changes.
 */

export type CitySheetCategory =
  | 'CRISIS_LINE' | 'ASSISTANCE_PROGRAM' | 'LEGAL_AID' | 'FOOD_RESOURCE' | 'HOUSING_UTILITIES'
  | 'EMPLOYMENT_JOB_SEARCH' | 'TRANSPORTATION' | 'BENEFITS_APPLICATION_SUPPORT'
  | 'MAIL_CORRESPONDENCE_SUPPORT' | 'HEALTHCARE' | 'OTHER';

export type CitySheetVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
export type CitySheetVerificationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type CitySheetEntryStatus = 'ACTIVE' | 'INACTIVE';
export type CitySheetVerificationEventType = 'VERIFIED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW';

export interface CitySheetEntryDto {
  id: string;
  citySheetRef: string | null;
  organizationName: string;
  category: CitySheetCategory;
  description: string;
  address: string | null;
  serviceArea: string;
  phone: string | null;
  website: string | null;
  hours: string;
  eligibilityRequirements: string | null;
  languagesSupported: string[];
  accessibilityNotes: string | null;
  cost: string | null;
  requiredDocuments: string[];
  referralRequired: boolean;
  isEmergencyService: boolean;
  isTestFixture: boolean;
  verificationStatus: CitySheetVerificationStatus;
  verificationConfidence: CitySheetVerificationConfidence | null;
  lastVerifiedAt: string | null;
  verifiedById: string | null;
  verificationNotes: string | null;
  rejectionReason: string | null;
  nextReviewDueAt: string | null;
  sourceNotes: string | null;
  status: CitySheetEntryStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCitySheetEntries {
  data: CitySheetEntryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VerificationChecklistItemDto {
  id: string;
  label: string;
}

export interface VerificationGuideDto {
  citySheetEntryId: string;
  citySheetRef: string | null;
  organizationName: string;
  category: string;
  currentVerificationStatus: string;
  checklist: VerificationChecklistItemDto[];
  callScript: string;
}

export interface ChecklistResponseInput {
  itemId: string;
  label: string;
  confirmed: boolean;
  note?: string;
}

export interface VerificationEventDto {
  id: string;
  citySheetEntryId: string;
  eventType: CitySheetVerificationEventType;
  previousStatus: CitySheetVerificationStatus;
  newStatus: CitySheetVerificationStatus;
  confidence: CitySheetVerificationConfidence | null;
  notes: string | null;
  checklistResponses: ChecklistResponseInput[] | null;
  performedById: string;
  performedAt: string;
}

export function listCitySheetEntries(
  accessToken: string,
  filters: { verificationStatus?: CitySheetVerificationStatus; q?: string; page?: number; limit?: number } = {},
): Promise<PaginatedCitySheetEntries> {
  const params = new URLSearchParams();
  if (filters.verificationStatus) params.set('verificationStatus', filters.verificationStatus);
  if (filters.q) params.set('q', filters.q);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 50));
  return apiRequest<PaginatedCitySheetEntries>(`/city-sheet?${params.toString()}`, { accessToken });
}

export function getVerificationGuide(accessToken: string, id: string): Promise<VerificationGuideDto> {
  return apiRequest<VerificationGuideDto>(`/city-sheet/${id}/verification-guide`, { accessToken });
}

export function listVerificationHistory(accessToken: string, id: string): Promise<VerificationEventDto[]> {
  return apiRequest<VerificationEventDto[]>(`/city-sheet/${id}/verification-history`, { accessToken });
}

export interface VerifyEntryInput {
  confidence: CitySheetVerificationConfidence;
  verificationNotes?: string;
  checklistResponses?: ChecklistResponseInput[];
  nextReviewDueAt?: string;
}

export function verifyCitySheetEntry(
  accessToken: string,
  id: string,
  input: VerifyEntryInput,
): Promise<CitySheetEntryDto> {
  return apiRequest<CitySheetEntryDto>(`/city-sheet/${id}/verify`, { method: 'POST', accessToken, body: input });
}

export interface RejectEntryInput {
  reason: string;
  confidence: CitySheetVerificationConfidence;
  checklistResponses?: ChecklistResponseInput[];
}

export function rejectCitySheetEntry(
  accessToken: string,
  id: string,
  input: RejectEntryInput,
): Promise<CitySheetEntryDto> {
  return apiRequest<CitySheetEntryDto>(`/city-sheet/${id}/reject`, { method: 'POST', accessToken, body: input });
}

export interface FlagEntryForReviewInput {
  reason: string;
  confidence?: CitySheetVerificationConfidence;
}

export function flagCitySheetEntryForReview(
  accessToken: string,
  id: string,
  input: FlagEntryForReviewInput,
): Promise<CitySheetEntryDto> {
  return apiRequest<CitySheetEntryDto>(`/city-sheet/${id}/flag-for-review`, { method: 'POST', accessToken, body: input });
}
