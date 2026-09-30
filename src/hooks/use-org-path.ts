"use client"

import { useParams, usePathname } from "next/navigation"

import { orgPath, stripOrgPrefix } from "@/lib/org-path"

/** Builds links inside the organization open in this tab. */
export function useOrgPath() {
  const { orgId } = useParams<{ orgId: string }>()
  return (path: string) => orgPath(orgId, path)
}

/** The current path without the /o/<id> prefix — for "is this menu item active". */
export function useOrgPathname() {
  return stripOrgPrefix(usePathname())
}
