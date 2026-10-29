import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LandingPage } from "@/components/landing/landing-page"
import { orgPath } from "@/lib/org-path"
import { LAST_ORGANIZATION_COOKIE } from "@/modules/auth/constants"
import { currentUser } from "@/modules/auth/session"
import { listUserOrganizations } from "@/modules/organizations/service"

export const metadata: Metadata = {
  title: "Capi — Gestão de recebimentos e repasses",
  description: "[COPY] Controle o dinheiro dos seus clientes sem planilha: concilie o extrato e repasse o valor certo.",
}

// Visitors get the landing page. Signed-in users go back to the company
// opened last, straight into the only one, the picker when there are
// several, or creating the first.
export default async function Home() {
  const user = await currentUser()
  if (!user) return <LandingPage />

  const [organizations, jar] = await Promise.all([listUserOrganizations(user.userId), cookies()])

  if (organizations.length === 0) redirect("/orgs/new")

  const lastId = jar.get(LAST_ORGANIZATION_COOKIE)?.value
  const target =
    organizations.find((organization) => organization.id === lastId) ??
    (organizations.length === 1 ? organizations[0] : null)

  redirect(target ? orgPath(target.id, "/dashboard") : "/orgs")
}
