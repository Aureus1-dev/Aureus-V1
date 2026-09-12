-- Person Conversation Identity: pronunciation is owned by the person profile, not an organization membership.
ALTER TABLE "Profile" ADD COLUMN "namePronunciation" TEXT;
