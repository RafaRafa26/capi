import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { Unauthenticated } from "@/shared/errors";
import { SESSION_DAYS, sessionByToken, type ActiveSession } from "./service";

export const SESSION_COOKIE = "capi_session";

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
 * Session for the current request, or null.
 *
 * React's `cache` deduplicates within a single render: the layout, the page,
 * and every server action can call this freely and the database is only
 * queried once.
 */
export const currentSession = cache(async (): Promise<ActiveSession | null> => {
  return sessionByToken(await requestToken());
});

/** For pages: redirects to login when there's no session. */
export async function requireSessionOrRedirect(): Promise<ActiveSession> {
  const session = await currentSession();
  if (!session) redirect("/login");
  return session;
}

/** For server actions: throws, so the edge's `catch` turns it into a message. */
export async function requireSession(): Promise<ActiveSession> {
  const session = await currentSession();
  if (!session) throw new Unauthenticated();
  return session;
}
