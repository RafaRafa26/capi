import { NextResponse, type NextRequest } from "next/server";

import { ORGANIZATION_HEADER, UUID } from "@/modules/auth/constants";

// Carries the organization in the URL (/o/<id>/...) to the page or server
// action handling the request — see ORGANIZATION_HEADER. This is routing,
// not authorization: membership is verified inside every page and action
// (src/modules/auth/session.ts), as Next's docs require.

const ORG_PATH = /^\/o\/([^/]+)/;

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Whatever the client sent is discarded; only the URL decides.
  requestHeaders.delete(ORGANIZATION_HEADER);

  const organizationId = ORG_PATH.exec(request.nextUrl.pathname)?.[1];
  const isOrganization = organizationId !== undefined && UUID.test(organizationId);
  if (isOrganization) requestHeaders.set(ORGANIZATION_HEADER, organizationId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
