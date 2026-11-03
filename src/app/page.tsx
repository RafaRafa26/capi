import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LandingPage } from "@/components/landing/landing-page"
import { orgPath } from "@/lib/org-path"
import { LAST_ORGANIZATION_COOKIE } from "@/modules/auth/constants"
import { currentUser } from "@/modules/auth/session"
import { listUserOrganizations } from "@/modules/organizations/service"

export const metadata: Metadata = {
  title: "Capi Gestão - A calma de uma capivara para o financeiro do seu negócio",
  description:
    "Gestão financeira para pequenos negócios: veja o que vai entrar e sair, confira seus números com o banco e decida sabendo onde está. Garantia de 14 dias.",
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
