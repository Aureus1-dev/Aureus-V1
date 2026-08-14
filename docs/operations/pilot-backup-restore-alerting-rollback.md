# Pilot Backup, Restore, Monitoring, Alerting, and Rollback

This document binds PF-010 to the production mechanisms that actually exist. It does not treat an environment-variable slot as proof that an external service is configured.

## Pre-deploy and backup

Before a production migration where operator-managed backup evidence is required:

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" ./scripts/db-migrate-deploy.sh
```

The wrapper runs `db-backup.sh` first (unless deliberately invoked with `SKIP_BACKUP=yes`), then `prisma migrate deploy`, then `prisma migrate status`. The backup is a PostgreSQL custom-format dump created by `pg_dump -Fc`.

Render's managed-database backup capability may provide an additional provider-level backup layer, but its actual plan/settings and successful restore availability must be verified in the production account rather than inferred from `render.yaml`.

## Restore drill

Never perform the first restore test against production. Provision an isolated non-production Postgres database and restore a selected backup:

```bash
createdb aureus_restore_drill
pg_restore --clean --if-exists --no-owner \
  --dbname="postgresql://.../aureus_restore_drill" \
  ./backups/aureus-YYYYMMDDTHHMMSSZ.dump
DATABASE_URL="postgresql://.../aureus_restore_drill" npx prisma migrate status
```

Then boot the accepted API SHA against the restored database and verify `/health/live`, `/health/ready`, tenant access, one approved-knowledge read, and one representative retained lead/operation if the backup contains pilot data. Record dump identifier/checksum, source environment, target drill database, accepted V1 SHA, result, and date. Destroy the drill database securely when evidence is captured.

## Monitoring and alerting

Repository-backed signals include `/health/live`, `/health/ready`, structured application logs, and the tenant-scoped provider/spend observations in the business console. `SENTRY_DSN` is supported for uncaught 5xx/fatal bootstrap reporting, but **unset means no Sentry delivery**.

Before an external pilot, configure and test at least one operator-notifying production alert route. If Sentry is selected, set the actual production `SENTRY_DSN`, generate a controlled test event, and confirm it is received by the Founder/operator. Also configure host/database notifications appropriate to the Render account. Record the destination and test evidence without committing credentials or secret webhook URLs.

Required alert classes for the pilot operator to be able to notice include: API readiness/unavailability, repeated 5xx/fatal errors, database unavailability, sustained AI-provider failure, and abnormal spend approaching configured stop-lines. Where the repository does not yet emit a dedicated threshold alert, the operator must use the provider/host alerting and business-console observations rather than claiming an automated alert exists.

## Rollback

Application rollback means redeploying the last known-good exact V1 SHA/image and verifying the deployed SHA plus health probes. Do not force-reset Git history or weaken migrations to simulate rollback.

Database schema changes are forward migrations by default. A prior application image is safe to redeploy only when it remains compatible with the migrated schema. If a migration is destructive/incompatible, restoration is an incident decision using the verified backup and must account for data written after that backup. Never run `prisma migrate reset` in production.

## Pilot deployment decision

A deployment is accepted only when:

1. the exact V1 SHA has green CI/Docker evidence;
2. required production environment variables validate;
3. a current backup/managed-backup recovery point exists where required;
4. migrations report clean status;
5. API/web health checks pass after deploy;
6. the configured alert route has been test-received;
7. the exact three-repository manifest and rollback target are recorded;
8. PF-012 manual gates are still pending/passed truthfully, never inferred from deployment success.
