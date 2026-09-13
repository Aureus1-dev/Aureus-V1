from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
service_path = ROOT / 'apps/api/src/authority/authority.service.ts'
service = service_path.read_text(encoding='utf-8')

# Prisma.sql is used for the same organization-row serialization pattern as Step 1 ownership transfer.
service = service.replace(
    '  OrganizationMemberRole,\n} from \'@prisma/client\';',
    '  OrganizationMemberRole,\n  Prisma,\n} from \'@prisma/client\';',
    1,
)

# Approval authority is revalidated inside the same transaction that creates the grant.
needle = """    return this.prisma.db.$transaction(async (tx) => {
      const claimed = await tx.authorityRequest.updateMany({
"""
replacement = """    return this.prisma.db.$transaction(async (tx) => {
      // Approval authority must still be true at the instant authority is
      // granted. Organization-owned approvals serialize on the same company
      // row Step 1 ownership transfer locks, then re-read current ownership.
      if (request.contextType === AuthorityContextType.PERSONAL) {
        if (request.subjectUserId !== caller.id) throw new NotFoundException('Permission request not found');
      } else if (ALWAYS_PERSON_CONTROLLED.has(request.resourceClass)) {
        if (!request.subjectUserId || request.subjectUserId !== caller.id) {
          throw new NotFoundException('Permission request not found');
        }
        const membership = await tx.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: request.organizationId!, userId: caller.id } },
          select: { id: true },
        });
        if (!membership) throw new NotFoundException('Permission request not found');
      } else {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = CAST(${request.organizationId} AS uuid) FOR UPDATE`,
        );
        const membership = await tx.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: request.organizationId!, userId: caller.id } },
          select: { role: true },
        });
        if (membership?.role !== OrganizationMemberRole.OWNER) {
          throw new NotFoundException('Permission request not found');
        }
      }

      const claimed = await tx.authorityRequest.updateMany({
"""
if needle not in service:
    raise SystemExit('approve transaction target not found')
service = service.replace(needle, replacement, 1)

# Taking permission back revokes the entire exact permission, not merely one duplicate grant row.
start = service.index('  async revoke(grantId: string, dto: AuthorityReasonDto, caller: AuthenticatedUser) {')
end = service.index('\n  async suspend(', start)
old_revoke = service[start:end]
new_revoke = """  async revoke(grantId: string, dto: AuthorityReasonDto, caller: AuthenticatedUser) {
    this.assertNoSecrets(dto.reason);
    const selected = await this.prisma.db.authorityGrant.findUnique({ where: { id: grantId } });
    if (!selected || !(await this.canControl(selected, caller.id))) throw new NotFoundException('Permission not found');

    return this.prisma.db.$transaction(async (tx) => {
      const exact = {
        contextType: selected.contextType,
        subjectUserId: selected.subjectUserId,
        organizationId: selected.organizationId,
        capability: selected.capability,
        resourceClass: selected.resourceClass,
        resourceRef: selected.resourceRef,
      };
      const active = await tx.authorityGrant.findMany({
        where: { ...exact, status: AuthorityGrantStatus.ACTIVE },
        select: { id: true },
      });
      if (active.length > 0) {
        const now = new Date();
        await tx.authorityGrant.updateMany({
          where: { id: { in: active.map((grant) => grant.id) } },
          data: { status: AuthorityGrantStatus.REVOKED, revokedAt: now, revokedByUserId: caller.id },
        });
        await tx.authorityEvent.createMany({
          data: active.map((grant) => ({
            eventType: AuthorityEventType.GRANT_REVOKED,
            actorUserId: caller.id,
            grantId: grant.id,
            contextType: selected.contextType,
            subjectUserId: selected.subjectUserId,
            organizationId: selected.organizationId,
            capability: selected.capability,
            resourceClass: selected.resourceClass,
            resourceRef: selected.resourceRef,
            reason: dto.reason ?? 'Permission revoked',
          })),
        });
      }
      return tx.authorityGrant.findUniqueOrThrow({ where: { id: selected.id } });
    });
  }
"""
service = service[:start] + new_revoke + service[end:]

# Enforce the ownership shape when requests are created: person-controlled resource or organization-controlled resource, never both.
old_shape = """    if (ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && !dto.subjectUserId) {
      throw new BadRequestException(`${dto.resourceClass} authority must name the affected person`);
    }
"""
new_shape = """    if (dto.contextType === AuthorityContextType.BUSINESS_TENANT) {
      if (ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && !dto.subjectUserId) {
        throw new BadRequestException(`${dto.resourceClass} authority must name the affected person`);
      }
      if (!ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && dto.subjectUserId) {
        throw new BadRequestException('Organization-owned authority cannot be converted into personal authority by naming an employee');
      }
    }
"""
if old_shape not in service:
    raise SystemExit('business ownership shape target not found')
service = service.replace(old_shape, new_shape, 1)

# Gateway repeats hard structural/resource checks instead of trusting that grants were only ever created through one code path.
old_eval = """    if (dto.resourceClass === AuthorityResourceClass.CONVERSATION && !dto.resourceRef) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Conversation authority requires an exact conversation reference', null, actorUserId);
    }

    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);
"""
new_eval = """    if (dto.contextType === AuthorityContextType.BUSINESS_TENANT) {
      if (ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && !dto.subjectUserId) {
        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Human/private business authority requires the affected person', null, actorUserId);
      }
      if (!ALWAYS_PERSON_CONTROLLED.has(dto.resourceClass) && dto.subjectUserId) {
        return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Organization-owned authority may not be reclassified as employee-owned', null, actorUserId);
      }
    }

    if ((dto.resourceClass === AuthorityResourceClass.CONVERSATION || dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT) && !dto.resourceRef) {
      return this.recordDecision(dto, AuthorityDecisionResult.DENY, `${dto.resourceClass} authority requires an exact resource reference`, null, actorUserId);
    }
    if (dto.resourceClass === AuthorityResourceClass.CONVERSATION) {
      const conversation = await this.prisma.db.aiConversation.findFirst({
        where: { id: dto.resourceRef!, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!conversation) return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Private conversation does not belong to this authority subject', null, actorUserId);
    }
    if (dto.resourceClass === AuthorityResourceClass.CONNECTED_ACCOUNT) {
      const account = await this.prisma.db.connectedAccount.findFirst({
        where: { id: dto.resourceRef!, userId: dto.subjectUserId! }, select: { id: true },
      });
      if (!account) return this.recordDecision(dto, AuthorityDecisionResult.DENY, 'Connected account does not belong to this authority subject', null, actorUserId);
    }

    const scopeKey = this.scopeKey(dto.contextType, dto.subjectUserId, dto.organizationId);
"""
if old_eval not in service:
    raise SystemExit('gateway hard-boundary target not found')
service = service.replace(old_eval, new_eval, 1)
service_path.write_text(service, encoding='utf-8')

# E2E regression coverage.
spec_path = ROOT / 'apps/api/src/authority/authority.e2e.spec.ts'
spec = spec_path.read_text(encoding='utf-8')

old_subject_test = """  it('does not let an employee self-approve organization-owned authority merely by naming themselves as the subject', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.ACT,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
      purpose: 'Act on company operating data in my work context',
    }).expect(201);

    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(201);

    const result = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.ACT,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
    }).expect(201);
    expect(result.body.result).toBe('PERMIT');
  });

"""
new_subject_test = """  it('rejects attempts to disguise organization-owned authority as employee-owned authority', async () => {
    await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.ACT,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
      purpose: 'Act on company operating data in my work context',
    }).expect(400);

    const gateway = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.ACT,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
    }).expect(201);
    expect(gateway.body.result).toBe('DENY');
  });

"""
if old_subject_test not in spec:
    raise SystemExit('organization self-approval regression target not found')
spec = spec.replace(old_subject_test, new_subject_test, 1)

marker = """  it('keeps derived-pattern authority as a proposal and ignores an expired grant', async () => {
"""
extra = """  it('requires exact person ownership for human/private resources at the gateway', async () => {
    const noPerson = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      capability: AuthorityCapability.LISTEN,
      resourceClass: AuthorityResourceClass.MICROPHONE,
    }).expect(201);
    expect(noPerson.body.result).toBe('DENY');

    const noAccountRef = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      subjectUserId: employeeId,
      capability: AuthorityCapability.READ,
      resourceClass: AuthorityResourceClass.CONNECTED_ACCOUNT,
    }).expect(201);
    expect(noAccountRef.body.result).toBe('DENY');
  });

  it('revoking one duplicate grant takes back the exact permission completely', async () => {
    const body = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SEE,
      resourceClass: AuthorityResourceClass.FILES,
      purpose: 'See files I choose',
    };
    const first = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send(body).expect(201);
    const second = await request(app.getHttpServer()).post('/authority/requests').set(auth(employeeToken)).send(body).expect(201);
    const grant1 = await request(app.getHttpServer()).post(`/authority/requests/${first.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    await request(app.getHttpServer()).post(`/authority/requests/${second.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);

    await request(app.getHttpServer()).post(`/authority/grants/${grant1.body.id}/revoke`).set(auth(employeeToken)).send({ reason: 'Take this permission back' }).expect(201);
    const result = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.SEE,
      resourceClass: AuthorityResourceClass.FILES,
    }).expect(201);
    expect(result.body.result).toBe('DENY');

    const active = await prisma.db.authorityGrant.count({
      where: { subjectUserId: employeeId, capability: AuthorityCapability.SEE, resourceClass: AuthorityResourceClass.FILES, status: 'ACTIVE' },
    });
    expect(active).toBe(0);
  });

"""
if marker not in spec:
    raise SystemExit('final hardening test insertion target not found')
spec = spec.replace(marker, extra + marker, 1)

# Current-owner check after ownership has changed (sequential proof of revalidation).
insert_owner = """  it('never lets the employer approve an employee microphone permission; the employee can approve, suspend, and restore it', async () => {
"""
owner_test = """  it('rechecks the current organization OWNER at approval time', async () => {
    const created = await request(app.getHttpServer()).post('/authority/requests').set(auth(ownerToken)).send({
      contextType: AuthorityContextType.BUSINESS_TENANT,
      organizationId: orgId,
      capability: AuthorityCapability.WRITE,
      resourceClass: AuthorityResourceClass.BUSINESS_DATA,
      purpose: 'Write approved company operating data',
    }).expect(201);

    await request(app.getHttpServer()).patch(`/organizations/${orgId}/members/ownership/transfer`).set(auth(ownerToken)).send({ newOwnerUserId: employeeId }).expect(200);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(ownerToken)).send({}).expect(404);
    await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    await request(app.getHttpServer()).patch(`/organizations/${orgId}/members/ownership/transfer`).set(auth(employeeToken)).send({ newOwnerUserId: ownerId }).expect(200);
  });

"""
if insert_owner not in spec:
    raise SystemExit('owner revalidation test target not found')
spec = spec.replace(insert_owner, owner_test + insert_owner, 1)
spec_path.write_text(spec, encoding='utf-8')
