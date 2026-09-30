import "server-only";

import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

import { prismaAdmin } from "@/db/client";
import { Prisma } from "@/db/generated/client";
import { BusinessError } from "@/shared/errors";
import { generateToken, hashToken } from "./tokens";
import type { SignUpInput } from "./schema";

// Opaque session in the database, not a JWT: revoking is a `DELETE`, and the
// cookie alone doesn't carry any claim about who the bearer is.
export const SESSION_DAYS = 30;

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

/**
 * Who is signed in. Deliberately carries no organization: a person can
 * belong to several, and which one a request is about comes from the URL
 * (see src/modules/auth/session.ts).
 */
export type UserSession = {
  userId: string;
  name: string;
  email: string;
};

async function openSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prismaAdmin.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  return { token, expiresAt };
}

/**
 * Open sign-up: anyone reaching the login screen can create an account. The
 * account starts with no organization — the next step is creating one or
 * accepting an invitation.
 *
 * Owner role for the same reason as the login lookup: e-mail uniqueness is
 * global, and a brand-new user isn't a member of any organization yet, so
 * RLS on `users` would hide the row it just inserted.
 */
export async function signUp(input: SignUpInput): Promise<{ token: string; expiresAt: Date }> {
  const email = input.email.trim().toLowerCase();

  try {
    const user = await prismaAdmin.user.create({
      data: { name: input.name.trim(), email, passwordHash: await hashPassword(input.password) },
    });
    return await openSession(user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BusinessError("Já existe uma conta com este e-mail.", "email");
    }
    throw error;
  }
}

/**
 * Checks e-mail and password and opens a session. Returns the token that
 * must go into the cookie.
 *
 * Runs under the database owner role because looking up a user by e-mail
 * inherently has to cross organizations.
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
    throw new BusinessError("E-mail ou senha inválidos.");
  }

  return openSession(user.id);
}

/** Resolves the cookie token into an active session, or null. */
export async function sessionByToken(token: string | undefined): Promise<UserSession | null> {
  if (!token) return null;

  const record = await prismaAdmin.session.findUnique({
    where: { tokenHash: hashToken(token) },
    // Runs on every request, ahead of the page's own queries: a single joined
    // query carrying only the fields UserSession needs.
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, active: true } },
    },
  });

  if (!record) return null;

  if (record.expiresAt.getTime() < Date.now()) {
    await prismaAdmin.session.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  const { user } = record;
  if (!user.active) return null;

  return { userId: user.id, name: user.name, email: user.email };
}

export async function endSession(token: string | undefined) {
  if (!token) return;
  await prismaAdmin.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
}

/** Removes expired sessions. Called at login so they don't pile up. */
export async function pruneExpiredSessions() {
  await prismaAdmin.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}
