import { apiRequest } from './http';

export type BusinessPublicStatus = 'PRIVATE' | 'PUBLISHED' | 'PAUSED';

export interface BusinessTenantSummary {
  id: string;
  organizationRef: string | null;
  name: string;
  status: string;
  verificationStatus: string;
  businessProfile: {
    publicStatus: BusinessPublicStatus;
    onboardingStep: number;
  } | null;
}

export interface BusinessProfile {
  id: string;
  organizationId: string;
  publicSlug: string | null;
  publicStatus: BusinessPublicStatus;
  serviceArea: { cities?: string[]; states?: string[]; postalCodes?: string[]; remote?: boolean };
  businessHours: Record<string, string>;
  contactRoutes: Array<{ type: 'PHONE' | 'SMS' | 'EMAIL' | 'WEBSITE'; value: string; label?: string }>;
  escalationTarget: { name?: string; email?: string; phone?: string } | null;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
}

export interface BusinessConsole {
  tenantId: string;
  tenantVersion: number;
  organization: BusinessTenantSummary & { websiteUrl: string };
  profile: BusinessProfile | null;
  membershipRole: string | null;
  canManage: boolean;
}

export interface UpdateBusinessProfileInput {
  publicSlug?: string;
  publicStatus?: BusinessPublicStatus;
  serviceArea: BusinessProfile['serviceArea'];
  businessHours: Record<string, string>;
  contactRoutes: BusinessProfile['contactRoutes'];
  escalationTarget?: NonNullable<BusinessProfile['escalationTarget']>;
  onboardingStep?: number;
}

export interface ProvisionBusinessWorkspaceInput {
  name: string;
  shortDescription: string;
  fullDescription: string;
  websiteUrl: string;
  contactEmail?: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
}

export function listMyBusinessTenants(accessToken: string): Promise<BusinessTenantSummary[]> {
  return apiRequest('/business-console/tenants', { accessToken, timeoutMs: 20_000 });
}

export function provisionBusinessWorkspace(
  accessToken: string,
  input: ProvisionBusinessWorkspaceInput,
): Promise<{ id: string }> {
  return apiRequest('/business-console/tenants', {
    method: 'POST',
    accessToken,
    timeoutMs: 20_000,
    body: { ...input, organizationType: 'BUSINESS' },
  });
}

export function getBusinessConsole(accessToken: string, tenantId: string): Promise<BusinessConsole> {
  return apiRequest(`/organizations/${tenantId}/business-console`, { accessToken, timeoutMs: 20_000 });
}

export function updateBusinessProfile(
  accessToken: string,
  tenantId: string,
  input: UpdateBusinessProfileInput,
): Promise<BusinessProfile> {
  return apiRequest(`/organizations/${tenantId}/business-console/profile`, {
    method: 'PATCH',
    accessToken,
    body: input,
    timeoutMs: 20_000,
  });
}
