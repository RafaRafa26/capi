import { AuthShell } from "@/components/auth/auth-shell"
import { NewOrganizationForm } from "@/components/organizations/new-organization-form"
import { requireUserOrRedirect } from "@/modules/auth/session"
import { listUserOrganizations } from "@/modules/organizations/service"

export default async function NewOrganizationPage() {
  const user = await requireUserOrRedirect()
  const organizations = await listUserOrganizations(user.userId)
  const isFirst = organizations.length === 0

  return (
    <AuthShell
      title={isFirst ? "Cadastre sua empresa" : "Nova empresa"}
      description="Você será o administrador e poderá convidar outras pessoas depois."
    >
      <NewOrganizationForm canCancel={!isFirst} />
    </AuthShell>
  )
}
