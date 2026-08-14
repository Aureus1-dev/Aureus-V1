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

export function listMyBusinessTenants(accessToken: string): Promise<BusinessTenantSummary[]> {
  return apiRequest('/business-console/tenants', { accessToken });
}

export function getBusinessConsole(accessToken: string, tenantId: string): Promise<BusinessConsole> {
  return apiRequest(`/organizations/${tenantId}/business-console`, { accessToken });
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
  });
}
