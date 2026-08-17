import { ForbiddenException } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import { BusinessTenantDirectoryController } from './business-tenant.controller';

describe('BusinessTenantDirectoryController', () => {
  const service = { listMyTenants: jest.fn() };
  const organizations = { create: jest.fn() };
  const controller = new BusinessTenantDirectoryController(service as never, organizations as never);

  beforeEach(() => jest.clearAllMocks());

  it('refuses business workspace creation from a guest session', () => {
    expect(() => controller.provisionMyTenant(
      {
        name: 'Example Business',
        shortDescription: 'Example business',
        fullDescription: 'Example business workspace',
        organizationType: OrganizationType.COMMUNITY_ORGANIZATION,
        websiteUrl: 'https://example.com',
      },
      { id: 'guest-1', email: 'guest@example.invalid', roles: [], isGuest: true },
    )).toThrow(ForbiddenException);
    expect(organizations.create).not.toHaveBeenCalled();
  });

  it('always provisions a BUSINESS tenant and delegates membership creation to OrganizationsService', () => {
    organizations.create.mockResolvedValue({ id: 'org-1' });
    const caller = { id: 'user-1', email: 'founder@example.com', roles: [], isGuest: false };
    const input = {
      name: 'Example Business',
      shortDescription: 'Example business',
      fullDescription: 'Example business workspace',
      organizationType: OrganizationType.COMMUNITY_ORGANIZATION,
      websiteUrl: 'https://example.com',
    };

    void controller.provisionMyTenant(input, caller);

    expect(organizations.create).toHaveBeenCalledWith(
      expect.objectContaining({ ...input, organizationType: OrganizationType.BUSINESS }),
      caller,
    );
  });
});
