import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

import { prismaAdmin } from "@/db/client";
import { BusinessError } from "@/shared/errors";

// Opaque session in the database, not a JWT: revoking is a `DELETE`, and the
// cookie alone doesn't carry any claim about who the bearer is.
export const SESSION_DAYS = 30;

/**
 * The token travels in the clear in the cookie and only its hash lives in
 * the database — reading a database dump doesn't let you assemble a valid
 * cookie from it.
 *
 * Unsalted SHA-256 is fine here (unlike a password): the token has 256 bits
 * of random entropy, so there's no search space to attack.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argonHash(password);
}

async function passwordMatches(hash: string, password: string) {
  try {
    return await argonVerify(hash, password);
  } catch {
    return false;
  }
}

export type ActiveSession = {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  organizationName: string;
  organizationDocument: string;
};

/**
 * Checks e-mail and password and opens a session. Returns the token that
 * must go into the cookie.
 *
 * Runs under the database owner role because looking up a user by e-mail
 * inherently has to cross organizations — the only point in the system with
 * that trait.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<{ token: string; expiresAt: Date }> {
  const user = await prismaAdmin.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Even with a nonexistent user, we spend the time of one password check,
  // so "e-mail doesn't exist" and "wrong password" can't be told apart by
  // response time.
  const hashToCheck =
    user?.passwordHash ??
    "$argon2id$v=19$m=19456,t=2,p=1$c2FsdEZvckNvbXBhcmlzb24$0000000000000000000000000000000000000000000";
  const matches = await passwordMatches(hashToCheck, password);

  if (!user || !user.active || !matches) {
    throw new BusinessError("Invalid e-mail or password.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prismaAdmin.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

/** Resolves the cookie token into an active session, or null. */
export async function sessionByToken(token: string | undefined): Promise<ActiveSession | null> {
  if (!token) return null;

  const record = await prismaAdmin.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { organization: true } } },
  });

  if (!record) return null;

  if (record.expiresAt.getTime() < Date.now()) {
    await prismaAdmin.session.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  const { user } = record;
  if (!user.active) return null;

  return {
    userId: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationName: user.organization.name,
    organizationDocument: user.organization.document,
  };
}

export async function endSession(token: string | undefined) {
  if (!token) return;
  await prismaAdmin.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
}

/** Removes expired sessions. Called at login so they don't pile up. */
export async function pruneExpiredSessions() {
  await prismaAdmin.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}
