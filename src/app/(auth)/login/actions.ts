"use server";

import { redirect } from "next/navigation";

import { signInSchema, signUpSchema } from "@/modules/auth/schema";
import { authenticate, endSession, pruneExpiredSessions, signUp } from "@/modules/auth/service";
import { clearSessionCookie, requestToken, setSessionCookie } from "@/modules/auth/session";
import { safeNextPath } from "@/lib/org-path";
import { failure, type Result } from "@/shared/errors";

export async function signInAction(form: FormData): Promise<Result> {
  try {
    const parsed = signInSchema.safeParse({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    const { token, expiresAt } = await authenticate(parsed.data.email, parsed.data.password);
    await setSessionCookie(token, expiresAt);
    void pruneExpiredSessions();

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function signUpAction(form: FormData): Promise<Result> {
  try {
    const parsed = signUpSchema.safeParse({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const { token, expiresAt } = await signUp(parsed.data);
    await setSessionCookie(token, expiresAt);

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

/** A form may send `next` so that signing back in returns there (e.g. an invitation link). */
export async function signOutAction(form?: FormData) {
  await endSession(await requestToken());
  await clearSessionCookie();

  const next = safeNextPath(form instanceof FormData ? String(form.get("next") ?? "") : null);
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
