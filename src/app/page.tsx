import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { orgPath } from "@/lib/org-path"
import { LAST_ORGANIZATION_COOKIE } from "@/modules/auth/constants"
import { requireUserOrRedirect } from "@/modules/auth/session"
import { listUserOrganizations } from "@/modules/organizations/service"

// Entry point after login: back to the company opened last, straight into
// the only one, the picker when there are several, or creating the first.
export default async function Home() {
  const user = await requireUserOrRedirect()
  const [organizations, jar] = await Promise.all([listUserOrganizations(user.userId), cookies()])

  if (organizations.length === 0) redirect("/orgs/new")

  const lastId = jar.get(LAST_ORGANIZATION_COOKIE)?.value
  const target =
    organizations.find((organization) => organization.id === lastId) ??
    (organizations.length === 1 ? organizations[0] : null)

  redirect(target ? orgPath(target.id, "/dashboard") : "/orgs")
}
