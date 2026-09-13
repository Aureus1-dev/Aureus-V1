from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Use the repository's existing web API helper.
web_api = ROOT / 'apps/web/lib/api/authority.ts'
text = web_api.read_text(encoding='utf-8')
text = text.replace("import { apiRequest } from './client';", "import { apiRequest } from './http';")
web_api.write_text(text, encoding='utf-8')

# Tighten business-scope validity and keep employee-private authority metadata
# out of an owner's organization-wide Trust Center view.
service_path = ROOT / 'apps/api/src/authority/authority.service.ts'
service = service_path.read_text(encoding='utf-8')

old_scope = """    if (!organizationId) return 'Business authority requires an organization';
    if (subjectUserId && !(await this.isOrganizationMember(organizationId, subjectUserId))) return 'Business subject is not an active member of this organization';
    return null;
"""
new_scope = """    if (!organizationId) return 'Business authority requires an organization';
    const organization = await this.prisma.db.organization.findUnique({
      where: { id: organizationId }, select: { id: true },
    });
    if (!organization) return 'Business organization does not exist';
    if (subjectUserId && !(await this.isOrganizationMember(organizationId, subjectUserId))) return 'Business subject is not an active member of this organization';
    return null;
"""
if old_scope not in service:
    raise SystemExit('scopeError patch target not found')
service = service.replace(old_scope, new_scope, 1)

old_visible = """    const visible = {
      OR: [
        { subjectUserId: caller.id },
        { organizationId: { in: ownerOrgIds } },
      ],
    };
"""
new_visible = """    // Organization ownership exposes organization-owned authority only.
    // A person's microphone/screen/private-conversation permission metadata
    // stays person-controlled even when it is scoped to their employer.
    const visible = {
      OR: [
        { subjectUserId: caller.id },
        { organizationId: { in: ownerOrgIds }, subjectUserId: null },
      ],
    };
"""
if old_visible not in service:
    raise SystemExit('visible patch target not found')
service = service.replace(old_visible, new_visible, 1)

old_requests = """        where: { OR: [{ subjectUserId: caller.id }, { requestedByUserId: caller.id }, { organizationId: { in: ownerOrgIds } }] },
"""
new_requests = """        where: { OR: [
          { subjectUserId: caller.id },
          { requestedByUserId: caller.id },
          { organizationId: { in: ownerOrgIds }, subjectUserId: null },
        ] },
"""
if old_requests not in service:
    raise SystemExit('request visibility patch target not found')
service = service.replace(old_requests, new_requests, 1)

old_events = """        where: { OR: [{ actorUserId: caller.id }, { subjectUserId: caller.id }, { organizationId: { in: ownerOrgIds } }] },
"""
new_events = """        where: { OR: [
          { actorUserId: caller.id },
          { subjectUserId: caller.id },
          { organizationId: { in: ownerOrgIds }, subjectUserId: null },
        ] },
"""
if old_events not in service:
    raise SystemExit('event visibility patch target not found')
service = service.replace(old_events, new_events, 1)

service_path.write_text(service, encoding='utf-8')
