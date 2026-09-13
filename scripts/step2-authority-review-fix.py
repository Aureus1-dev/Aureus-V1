from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
service_path = ROOT / 'apps/api/src/authority/authority.service.ts'
service = service_path.read_text(encoding='utf-8')

old = """  private async canControl(record: { contextType: AuthorityContextType; subjectUserId: string | null; organizationId: string | null }, userId: string) {
    if (record.subjectUserId) return record.subjectUserId === userId;
    if (!record.organizationId) return false;
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: record.organizationId, userId } },
      select: { role: true },
    });
    return membership?.role === OrganizationMemberRole.OWNER;
  }

  private async assertScopeController(contextType: AuthorityContextType, subjectUserId: string | undefined, organizationId: string | undefined, userId: string) {
    const error = await this.scopeError(contextType, subjectUserId, organizationId);
    if (error) throw new BadRequestException(error);
    if (!(await this.canControl({ contextType, subjectUserId: subjectUserId ?? null, organizationId: organizationId ?? null }, userId))) {
      throw new NotFoundException('Authority scope not found');
    }
  }
"""
new = """  private async canControl(record: {
    contextType: AuthorityContextType;
    subjectUserId: string | null;
    organizationId: string | null;
    resourceClass: AuthorityResourceClass;
  }, userId: string) {
    if (record.contextType === AuthorityContextType.PERSONAL) {
      return record.subjectUserId === userId;
    }

    // Naming an employee never converts organization-owned authority into
    // employee-owned authority. Only explicitly human/private resource
    // classes follow the affected person; every other Business permission
    // starts conservatively with the current organization OWNER.
    if (ALWAYS_PERSON_CONTROLLED.has(record.resourceClass)) {
      return Boolean(record.subjectUserId) && record.subjectUserId === userId;
    }
    if (!record.organizationId) return false;
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: record.organizationId, userId } },
      select: { role: true },
    });
    return membership?.role === OrganizationMemberRole.OWNER;
  }

  private async assertScopeController(contextType: AuthorityContextType, subjectUserId: string | undefined, organizationId: string | undefined, userId: string) {
    const error = await this.scopeError(contextType, subjectUserId, organizationId);
    if (error) throw new BadRequestException(error);

    // Capability suspension is deliberately simpler than a grant: a person
    // controls their own person-scoped kill switch, while the business OWNER
    // controls the organization-wide kill switch.
    if (contextType === AuthorityContextType.PERSONAL || subjectUserId) {
      if (subjectUserId !== userId) throw new NotFoundException('Authority scope not found');
      return;
    }
    if (!organizationId) throw new NotFoundException('Authority scope not found');
    const membership = await this.prisma.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true },
    });
    if (membership?.role !== OrganizationMemberRole.OWNER) {
      throw new NotFoundException('Authority scope not found');
    }
  }
"""
if old not in service:
    raise SystemExit('canControl/assertScopeController target not found')
service = service.replace(old, new, 1)
service_path.write_text(service, encoding='utf-8')

spec_path = ROOT / 'apps/api/src/authority/authority.e2e.spec.ts'
spec = spec_path.read_text(encoding='utf-8')

needle = """    const grant = await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');

    await request(app.getHttpServer()).post(`/authority/grants/${grant.body.id}/revoke`).set(auth(employeeToken)).send({ reason: 'I changed my mind' }).expect(201);
"""
replacement = """    const grant = await request(app.getHttpServer()).post(`/authority/requests/${created.body.id}/approve`).set(auth(employeeToken)).send({}).expect(201);
    expect((await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send(evaluation).expect(201)).body.result).toBe('PERMIT');

    // Knowing a grant id never gives another tenant/person control over it.
    await request(app.getHttpServer()).post(`/authority/grants/${grant.body.id}/revoke`).set(auth(outsiderToken)).send({ reason: 'not mine' }).expect(404);
    await request(app.getHttpServer()).post(`/authority/grants/${grant.body.id}/revoke`).set(auth(employeeToken)).send({ reason: 'I changed my mind' }).expect(201);
"""
if needle not in spec:
    raise SystemExit('personal revoke test target not found')
spec = spec.replace(needle, replacement, 1)

insert_before = """  it('never lets the employer approve an employee microphone permission; the employee can approve, suspend, and restore it', async () => {
"""
new_test = """  it('does not let an employee self-approve organization-owned authority merely by naming themselves as the subject', async () => {
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
if insert_before not in spec:
    raise SystemExit('organization ownership test insertion target not found')
spec = spec.replace(insert_before, new_test + insert_before, 1)

final_marker = """  it('rejects secret material from the authority ledger and exposes a plain trust snapshot', async () => {
"""
resume_test = """  it('resume never manufactures authority when no active grant exists', async () => {
    const scope = {
      contextType: AuthorityContextType.PERSONAL,
      subjectUserId: employeeId,
      capability: AuthorityCapability.WRITE,
    };
    await request(app.getHttpServer()).post('/authority/capabilities/suspend').set(auth(employeeToken)).send({ ...scope, reason: 'pause writes' }).expect(201);
    await request(app.getHttpServer()).post('/authority/capabilities/resume').set(auth(employeeToken)).send(scope).expect(201);
    const result = await request(app.getHttpServer()).post('/authority/evaluate').set(auth(employeeToken)).send({
      ...scope,
      resourceClass: AuthorityResourceClass.FILES,
    }).expect(201);
    expect(result.body.result).toBe('NEEDS_APPROVAL');
  });

"""
if final_marker not in spec:
    raise SystemExit('resume test insertion target not found')
spec = spec.replace(final_marker, resume_test + final_marker, 1)
spec_path.write_text(spec, encoding='utf-8')
