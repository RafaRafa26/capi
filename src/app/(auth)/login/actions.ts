"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { authenticate, endSession, pruneExpiredSessions } from "@/modules/auth/service";
import { clearSessionCookie, requestToken, setSessionCookie } from "@/modules/auth/session";
import { failure, type Result } from "@/shared/errors";

const loginSchema = z.object({
  email: z.email("Enter a valid e-mail."),
  password: z.string().min(1, "Enter your password."),
});

export async function signInAction(form: FormData): Promise<Result> {
  try {
    const parsed = loginSchema.safeParse({
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

export async function signOutAction() {
  await endSession(await requestToken());
  await clearSessionCookie();
  redirect("/login");
}
