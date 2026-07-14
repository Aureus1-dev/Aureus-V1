// Loads the monorepo-root .env for local test runs. In CI, DATABASE_URL and
// JWT_ACCESS_SECRET are already set as job-level env vars, so this is a no-op.
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
}
