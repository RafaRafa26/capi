"use server"

import { redirect } from "next/navigation"

import { requireUser } from "@/modules/auth/session"
import { createAuthorizationCode, parseAuthorizationRequest, pruneExpiredCodes } from "@/modules/oauth/service"

function paramsFrom(form: FormData): Record<string, string | undefined> {
  const read = (key: string) => {
    const value = form.get(key)
    return typeof value === "string" && value !== "" ? value : undefined
  }
  return {
    client_id: read("client_id"),
    redirect_uri: read("redirect_uri"),
    response_type: "code",
    code_challenge: read("code_challenge"),
    code_challenge_method: "S256",
    scope: read("scope"),
    state: read("state"),
  }
}

/**
 * "Permitir" / "Recusar" on the consent screen. Everything is validated
 * again here — the hidden fields came back from the browser.
 */
export async function decideAuthorizationAction(form: FormData) {
  const user = await requireUser()
  const parsed = await parseAuthorizationRequest(paramsFrom(form))
  if (!parsed.ok) {
    if (parsed.redirect) redirect(parsed.redirect)
    throw new Error(parsed.error)
  }

  const { request } = parsed
  const target = new URL(request.redirectUri)
  if (request.state) target.searchParams.set("state", request.state)

  if (form.get("decision") !== "allow") {
    target.searchParams.set("error", "access_denied")
    redirect(target.toString())
  }

  const code = await createAuthorizationCode(user.userId, request)
  void pruneExpiredCodes()
  target.searchParams.set("code", code)
  redirect(target.toString())
}
