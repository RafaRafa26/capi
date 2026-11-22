import { basicClientCredentials, json, oauthErrorResponse, preflight, readParams } from "@/modules/oauth/http"
import { exchangeToken } from "@/modules/oauth/service"

// Token endpoint: authorization_code (with PKCE) and refresh_token grants.
export async function POST(request: Request) {
  try {
    const params = await readParams(request)
    const basic = basicClientCredentials(request)
    return json(
      await exchangeToken({
        ...params,
        client_id: params.client_id ?? basic.clientId,
        client_secret: params.client_secret ?? basic.clientSecret,
      }),
    )
  } catch (error) {
    return oauthErrorResponse(error)
  }
}

export const OPTIONS = preflight
