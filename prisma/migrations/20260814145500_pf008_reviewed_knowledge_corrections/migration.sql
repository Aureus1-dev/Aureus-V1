-- PF-008: reviewed corrections are replacement records, never in-place edits.
-- An approved source remains live while its correction is DRAFT or UNDER_REVIEW.
-- Only the same transaction that approves the correction archives the prior
-- approved record, so the Ward never observes an unreviewed replacement.

CREATE FUNCTION "activate_reviewed_business_knowledge_correction"()
RETURNS trigger AS $$
DECLARE
  original_id UUID;
  original_status "BusinessKnowledgeStatus";
BEGIN
  IF NEW."status" <> 'APPROVED'
    OR OLD."status" = 'APPROVED'
    OR NEW."sourceReference" NOT LIKE 'PF008_CORRECTION_OF:%'
  THEN
    RETURN NEW;
  END IF;

  BEGIN
    original_id := split_part(
      substr(NEW."sourceReference", length('PF008_CORRECTION_OF:') + 1),
      '|',
      1
    )::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid PF-008 correction provenance';
  END;

  IF original_id = NEW."id" THEN
    RAISE EXCEPTION 'A business knowledge record cannot correct itself';
  END IF;

  SELECT "status"
    INTO original_status
    FROM "BusinessKnowledgeRecord"
   WHERE "id" = original_id
     AND "organizationId" = NEW."organizationId"
     AND "deletedAt" IS NULL
   FOR UPDATE;

  IF NOT FOUND OR original_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Correction may replace only a currently approved source in the same tenant';
  END IF;

  UPDATE "BusinessKnowledgeRecord"
     SET "status" = 'ARCHIVED',
         "updatedAt" = CURRENT_TIMESTAMP
   WHERE "id" = original_id
     AND "organizationId" = NEW."organizationId";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BusinessKnowledgeRecord_reviewed_correction_activation"
BEFORE UPDATE OF "status" ON "BusinessKnowledgeRecord"
FOR EACH ROW EXECUTE FUNCTION "activate_reviewed_business_knowledge_correction"();
