from pathlib import Path
import re

# Service: replace Personal Need acceptance method.
p = Path("apps/api/src/responsibilities/responsibilities.service.ts")
s = p.read_text()
pattern = re.compile(
    r"  async acceptPersonalNeedResolution\(.*?\n  async findOwnedPersonalNeedResolution\(",
    re.S,
)
replacement = """  async acceptPersonalNeedResolution(
    input: {
      conversationId: string;
      objective: string;
      successCriteria: Prisma.InputJsonValue;
      dueAt?: Date | null;
    },
    caller: AuthenticatedUser,
  ): Promise<ResponsibilityResponseDto> {
    await this.validateOwnedConversation(input.conversationId, caller);

    const requestedCriteria = input.successCriteria as { statedNeedId?: unknown };
    const requestedNeedId =
      typeof requestedCriteria?.statedNeedId === 'string'
        ? requestedCriteria.statedNeedId
        : null;
    if (!requestedNeedId) {
      throw new ConflictException(
        'Personal Need Responsibility requires canonical StatedNeed provenance',
      );
    }

    const latest = await this.repo.findLatestPersonalByConversationKind(
      caller.id,
      input.conversationId,
      ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
    );
    if (latest) {
      const latestCriteria = latest.successCriteria as { statedNeedId?: unknown } | null;
      const latestNeedId =
        latestCriteria && typeof latestCriteria.statedNeedId === 'string'
          ? latestCriteria.statedNeedId
          : null;

      // Same canonical need stays the same promise even after terminal state.
      // POST retries therefore return terminal truth instead of reopening work.
      if (latestNeedId === requestedNeedId) {
        return ResponsibilityResponseDto.fromEntity(latest);
      }

      const terminal =
        latest.status === ResponsibilityStatus.COMPLETED ||
        latest.status === ResponsibilityStatus.RESPONSIBLY_EXHAUSTED ||
        latest.status === ResponsibilityStatus.CANCELLED;
      if (!terminal) {
        throw new ConflictException(
          'This conversation already has an open Personal Need Responsibility for different StatedNeed provenance',
        );
      }
    }

    const responsibility = await this.repo.createAccepted({
      principalUserId: caller.id,
      kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
      objective: input.objective.slice(0, 2000),
      originConversationId: input.conversationId,
      originOpportunityId: null,
      successCriteria: input.successCriteria,
      dueAt: input.dueAt ?? null,
    });

    // If a concurrent request for different provenance won the database race,
    // never return its Responsibility as though it belonged to this request.
    const persistedCriteria = responsibility.successCriteria as {
      statedNeedId?: unknown;
    } | null;
    if (persistedCriteria?.statedNeedId !== requestedNeedId) {
      throw new ConflictException(
        'Personal Need Responsibility provenance changed during concurrent acceptance',
      );
    }

    return ResponsibilityResponseDto.fromEntity(responsibility);
  }

  async findOwnedPersonalNeedResolution("""
s2, count = pattern.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit(f"acceptPersonalNeedResolution method match count={count}")
p.write_text(s2)

# Integration race test: every concurrent request is the same canonical need.
p = Path("apps/api/src/responsibilities/responsibilities.integration.spec.ts")
s = p.read_text()
start = s.find("deduplicates concurrent Personal Need acceptance")
if start == -1:
    raise SystemExit("integration race test missing")
anchor = "    const conversationId = randomUUID();\n    const attempts = await Promise.all("
idx = s.find(anchor, start)
if idx == -1:
    raise SystemExit("integration conversation anchor missing")
s = s[:idx] + anchor.replace(
    "    const attempts",
    "    const statedNeedId = randomUUID();\n    const attempts",
) + s[idx + len(anchor):]
target = "            statedNeedId: randomUUID(),"
idx = s.find(target, start)
if idx == -1:
    raise SystemExit("integration statedNeedId anchor missing")
s = s[:idx] + "            statedNeedId," + s[idx + len(target):]
bad = "    expect(new Set(attempts.map((row) => row.id))).toHaveLength(1);"
if bad not in s:
    raise SystemExit("integration Set assertion anchor missing")
s = s.replace(
    bad,
    "    expect(new Set(attempts.map((row) => row.id)).size).toBe(1);",
    1,
)
p.write_text(s)

# E2E terminal retry: same StatedNeed is the same terminal Responsibility.
p = Path("apps/api/src/people-resolutions/people-resolutions.e2e.spec.ts")
s = p.read_text()
pattern = re.compile(
    r"  it\('does not reopen terminal work on retry'.*?\n  \}\);\n(?=\}\);\s*$)",
    re.S,
)
replacement = """  it('does not reopen terminal work on retry of the same StatedNeed', async () => {
    const retry = await request(app.getHttpServer())
      .post('/people/resolutions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statedNeedId, objective: 'Try again after completion' })
      .expect(201);

    expect(retry.body.responsibility.id).toBe(responsibilityId);
    expect(retry.body.responsibility.status).toBe(ResponsibilityStatus.COMPLETED);
    expect(
      await prisma.db.responsibility.count({
        where: {
          principalUserId: ownerId,
          kind: ResponsibilityKind.PERSONAL_NEED_RESOLUTION,
          originConversationId: conversationId,
        },
      }),
    ).toBe(1);
  });
"""
s2, count = pattern.subn(replacement, s, count=1)
if count != 1:
    raise SystemExit(f"terminal retry test match count={count}")
p.write_text(s2)

# Frozen contract alignment if the older sentence remains.
p = Path("docs/work-orders/AUREUS-PEOPLE-STEP1-NEED-TO-RESOLUTION.md")
s = p.read_text()
old = "- A later explicit member request may create a new responsibility when the prior one is terminal; GET/retry must never reopen terminal work."
new = "- GET/retry or repeated acceptance of the same canonical StatedNeed must return terminal truth and never reopen or duplicate it. A genuinely new member request requires new StatedNeed provenance before a new Responsibility may be created."
if old in s:
    s = s.replace(old, new, 1)
p.write_text(s)
