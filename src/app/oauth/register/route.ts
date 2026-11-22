import { json, oauthErrorResponse, preflight } from "@/modules/oauth/http"
import { registerClient } from "@/modules/oauth/service"

// Dynamic Client Registration (RFC 7591).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return json({ error: "invalid_client_metadata", error_description: "JSON body required." }, { status: 400 })
    }
    return json(await registerClient(body), { status: 201 })
  } catch (error) {
    return oauthErrorResponse(error)
  }
}

export const OPTIONS = preflight
