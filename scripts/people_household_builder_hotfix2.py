from pathlib import Path

p = Path('scripts/people_household_builder.py')
text = p.read_text()

blocks = [
'''replace_once(
    svc,
    "      organizationId: dto.organizationId ?? null,\\n      capability: dto.capability,",
    "      organizationId: dto.organizationId ?? null,\\n      delegateUserId: dto.delegateUserId ?? null,\\n      capability: dto.capability,",
)
''',
'''replace_once(
    svc,
    "        organizationId: dto.organizationId ?? null,\\n        capability: dto.capability,",
    "        organizationId: dto.organizationId ?? null,\\n        delegateUserId: dto.delegateUserId ?? null,\\n        capability: dto.capability,",
)
''',
'''replace_once(
    svc,
    "      organizationId: dto.organizationId ?? null,\\n      capability: dto.capability,\\n      resourceClass: dto.resourceClass,",
    "      organizationId: dto.organizationId ?? null,\\n      delegateUserId: dto.delegateUserId ?? null,\\n      capability: dto.capability,\\n      resourceClass: dto.resourceClass,",
)
''',
]
for block in blocks:
    if block not in text:
        raise RuntimeError('expected generic delegate replacement block was not found')
    text = text.replace(block, '', 1)

anchor = '''# ---------------------------------------------------------------------------
# Household backend
# ---------------------------------------------------------------------------
'''
method_edits = r'''# Method-anchored delegate edits avoid ambiguous indentation-only matches.
replace_once(
    svc,
    "  private exactGrantWhere(dto: AuthorityEvaluationDto) {\\n    const share = this.normalizeShareScope(dto);\\n    return {\\n      contextType: dto.contextType,\\n      subjectUserId: dto.subjectUserId ?? null,\\n      organizationId: dto.organizationId ?? null,\\n      capability: dto.capability,",
    "  private exactGrantWhere(dto: AuthorityEvaluationDto) {\\n    const share = this.normalizeShareScope(dto);\\n    return {\\n      contextType: dto.contextType,\\n      subjectUserId: dto.subjectUserId ?? null,\\n      organizationId: dto.organizationId ?? null,\\n      delegateUserId: dto.delegateUserId ?? null,\\n      capability: dto.capability,",
)
replace_once(
    svc,
    "  private async recordDecision(dto: AuthorityEvaluationDto, result: AuthorityDecisionResult, reason: string, grantId: string | null, actorUserId?: string) {\\n    const decision = await this.prisma.db.authorityDecision.create({\\n      data: {\\n        actorUserId: actorUserId ?? null,\\n        contextType: dto.contextType,\\n        subjectUserId: dto.subjectUserId ?? null,\\n        organizationId: dto.organizationId ?? null,\\n        capability: dto.capability,",
    "  private async recordDecision(dto: AuthorityEvaluationDto, result: AuthorityDecisionResult, reason: string, grantId: string | null, actorUserId?: string) {\\n    const decision = await this.prisma.db.authorityDecision.create({\\n      data: {\\n        actorUserId: actorUserId ?? null,\\n        contextType: dto.contextType,\\n        subjectUserId: dto.subjectUserId ?? null,\\n        organizationId: dto.organizationId ?? null,\\n        delegateUserId: dto.delegateUserId ?? null,\\n        capability: dto.capability,",
)

'''
if anchor not in text:
    raise RuntimeError('household backend anchor missing')
text = text.replace(anchor, method_edits + anchor, 1)
p.write_text(text)
