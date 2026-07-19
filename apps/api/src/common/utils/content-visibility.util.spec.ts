import { NotFoundException } from '@nestjs/common';
import { UserRole, VerificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { assertContentVisible } from './content-visibility.util';

const MODERATOR_ROLES = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR];

const caller = (roles: UserRole[]): AuthenticatedUser => ({ id: 'user-1', email: 'u@example.test', roles });

describe('assertContentVisible (PD-001)', () => {
  it('allows VERIFIED content through for an anonymous caller', () => {
    expect(() => assertContentVisible(VerificationStatus.VERIFIED, undefined, MODERATOR_ROLES, 'not found')).not.toThrow();
  });

  it('allows VERIFIED content through for any authenticated caller', () => {
    expect(() => assertContentVisible(VerificationStatus.VERIFIED, caller([UserRole.MEMBER]), MODERATOR_ROLES, 'not found')).not.toThrow();
  });

  it('blocks DRAFT content from an anonymous caller', () => {
    expect(() => assertContentVisible(VerificationStatus.DRAFT, undefined, MODERATOR_ROLES, 'not found')).toThrow(NotFoundException);
  });

  it('blocks PENDING_REVIEW content from a non-privileged authenticated caller', () => {
    expect(() => assertContentVisible(VerificationStatus.PENDING_REVIEW, caller([UserRole.MEMBER]), MODERATOR_ROLES, 'not found'))
      .toThrow(NotFoundException);
  });

  it('blocks REJECTED content even from the content author, if not privileged', () => {
    expect(() => assertContentVisible(VerificationStatus.REJECTED, caller([UserRole.ORGANIZATION_REPRESENTATIVE]), MODERATOR_ROLES, 'not found'))
      .toThrow(NotFoundException);
  });

  it('allows DRAFT/PENDING_REVIEW/REJECTED content through for a privileged caller', () => {
    for (const status of [VerificationStatus.DRAFT, VerificationStatus.PENDING_REVIEW, VerificationStatus.REJECTED]) {
      expect(() => assertContentVisible(status, caller([UserRole.STEWARD]), MODERATOR_ROLES, 'not found')).not.toThrow();
      expect(() => assertContentVisible(status, caller([UserRole.PLATFORM_ADMINISTRATOR]), MODERATOR_ROLES, 'not found')).not.toThrow();
    }
  });
});
