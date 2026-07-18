import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/users/dto/*` and
 * `apps/api/src/administration/dto/*` exactly (FPB-009 §8). List/role
 * grant/revoke are Steward/Administrator surfaces — the Founder Operating
 * System's User & Role Management panel (PR-003) is their first frontend
 * consumer.
 */
export type UserRole =
  | 'MEMBER' | 'STEWARD' | 'ORGANIZATION_REPRESENTATIVE' | 'BUSINESS_REPRESENTATIVE'
  | 'PLATFORM_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR' | 'AI_SERVICE_ACCOUNT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: UserRole[];
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedUsersDto {
  data: UserDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
}

export function listUsers(accessToken: string, params: ListUsersParams = {}): Promise<PaginatedUsersDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.role) query.set('role', params.role);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedUsersDto>(`/users${suffix}`, { accessToken });
}

export function getUser(accessToken: string, id: string): Promise<UserDto> {
  return apiRequest<UserDto>(`/users/${id}`, { accessToken });
}

export interface UpdateUserInput {
  emailVerified?: boolean;
  status?: UserStatus;
}

export function updateUser(accessToken: string, id: string, input: UpdateUserInput): Promise<UserDto> {
  return apiRequest<UserDto>(`/users/${id}`, { method: 'PATCH', accessToken, body: input });
}

export function grantRole(accessToken: string, userId: string, role: UserRole): Promise<UserDto> {
  return apiRequest<UserDto>(`/users/${userId}/roles/grant`, { method: 'POST', accessToken, body: { role } });
}

export function revokeRole(accessToken: string, userId: string, role: UserRole): Promise<UserDto> {
  return apiRequest<UserDto>(`/users/${userId}/roles/revoke`, { method: 'POST', accessToken, body: { role } });
}
