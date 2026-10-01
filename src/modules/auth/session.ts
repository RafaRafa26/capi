import "server-only";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { findMembership } from "@/modules/organizations/service";
import { BusinessError, Unauthenticated } from "@/shared/errors";
import { ORGANIZATION_HEADER, SESSION_COOKIE, UUID } from "./constants";
import { can, type Permission, type Role } from "./permissions";
import { SESSION_DAYS, sessionByToken, type UserSession } from "./service";

export { SESSION_COOKIE };

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requestToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

/**
 * The signed-in person for the current request, or null.
 *
 * React's `cache` deduplicates within a single render: the layout, the page,
 * and every server action can call this freely and the database is only
 * queried once.
 */
export const currentUser = cache(async (): Promise<UserSession | null> => {
  return sessionByToken(await requestToken());
});

/** For pages outside an organization (picker, new organization, invitation). */
export async function requireUserOrRedirect(): Promise<UserSession> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions outside an organization. */
export async function requireUser(): Promise<UserSession> {
  const user = await currentUser();
  if (!user) throw new Unauthenticated();
  return user;
}

/** A signed-in user working inside one organization they belong to. */
export type ActiveSession = UserSession & {
  organizationId: string;
  organizationName: string;
  organizationDocument: string;
  role: Role;
};

/**
 * Which organization this request is about: the /o/<id>/ segment of the URL,
 * forwarded by src/proxy.ts. Never trusted on its own — see currentSession.
 */
async function requestedOrganizationId(): Promise<string | null> {
  const id = (await headers()).get(ORGANIZATION_HEADER);
  return id && UUID.test(id) ? id : null;
}

/**
 * Session inside the organization in the URL, or null when there's no user,
 * no organization in the URL, or the user isn't a member of it. Membership
 * is checked on every request, so removing someone takes effect at once.
 */
export const currentSession = cache(async (): Promise<ActiveSession | null> => {
  const [user, organizationId] = await Promise.all([currentUser(), requestedOrganizationId()]);
  if (!user || !organizationId) return null;

  const membership = await findMembership(user.userId, organizationId);
  if (!membership) return null;

  return {
    ...user,
    organizationId: membership.id,
    organizationName: membership.name,
    organizationDocument: membership.document,
    role: membership.role,
  };
});

/**
 * For pages under /o/<id>/: redirects to login when there's no session, and
 * answers 404 when the user isn't a member — the same as for an organization
 * that doesn't exist, so ids can't be probed.
 */
export async function requireSessionOrRedirect(): Promise<ActiveSession> {
  if (!(await currentUser())) redirect("/login");
  const session = await currentSession();
  if (!session) notFound();
  return session;
}

export class Forbidden extends BusinessError {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "Forbidden";
  }
}

/**
 * For server actions: throws, so the edge's `catch` turns it into a message.
 * Pass the permission the action needs; reads need none.
 */
export async function requireSession(permission?: Permission): Promise<ActiveSession> {
  if (!(await currentUser())) throw new Unauthenticated();
  const session = await currentSession();
  if (!session) throw new Forbidden("Você não tem acesso a esta empresa.");
  if (permission && !can(session.role, permission)) throw new Forbidden();
  return session;
}
