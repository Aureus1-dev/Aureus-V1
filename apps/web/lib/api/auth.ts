import { apiRequest } from './http';

/**
 * DTO shapes mirror `apps/api/src/auth/dto/*` and `users/dto/user-response.dto.ts`
 * exactly (FPB-009 §8). Do not add fields the backend does not return.
 */
export type UserRole = 'MEMBER' | 'STEWARD' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

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

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponseDto {
  user: UserDto;
  tokens: TokenPairDto;
}

export function register(email: string, password: string): Promise<AuthResponseDto> {
  return apiRequest<AuthResponseDto>('/auth/register', {
    method: 'POST',
    body: { email, password },
    retryOn401: false,
  });
}

export function login(email: string, password: string): Promise<AuthResponseDto> {
  return apiRequest<AuthResponseDto>('/auth/login', {
    method: 'POST',
    body: { email, password },
    retryOn401: false,
  });
}

export function refresh(refreshToken: string): Promise<TokenPairDto> {
  return apiRequest<TokenPairDto>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    retryOn401: false,
  });
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    retryOn401: false,
  });
}

export function forgotPassword(email: string): Promise<void> {
  return apiRequest<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    retryOn401: false,
  });
}

export function resetPassword(token: string, password: string): Promise<void> {
  return apiRequest<void>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    retryOn401: false,
  });
}

export function verifyEmail(token: string): Promise<void> {
  return apiRequest<void>('/auth/verify-email', {
    method: 'POST',
    body: { token },
    retryOn401: false,
  });
}

export function me(accessToken: string): Promise<UserDto> {
  return apiRequest<UserDto>('/auth/me', { accessToken, retryOn401: false });
}
