import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Bearer tokens (session cookie, invitation link) travel in the clear and
 * only their hash lives in the database — reading a database dump doesn't
 * let you assemble a valid cookie or link from it.
 *
 * Unsalted SHA-256 is fine here (unlike a password): the token has 256 bits
 * of random entropy, so there's no search space to attack.
 */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken() {
  return randomBytes(32).toString("base64url");
}
