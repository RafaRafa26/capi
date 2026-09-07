// Runs before any test module is imported — ESM imports are hoisted, so
// loading .env from inside a test file would be too late for the database
// client, which reads process.env at import time.
import "dotenv/config";
