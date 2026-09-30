import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRightIcon, PlusIcon } from "lucide-react"

import { signOutAction } from "@/app/(auth)/login/actions"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { formatDocument } from "@/lib/document"
import { orgPath } from "@/lib/org-path"
import { roleLabels } from "@/modules/auth/permissions"
import { requireUserOrRedirect } from "@/modules/auth/session"
import { listUserOrganizations } from "@/modules/organizations/service"

export default async function OrganizationsPage() {
  const user = await requireUserOrRedirect()
  const organizations = await listUserOrganizations(user.userId)

  if (organizations.length === 0) redirect("/orgs/new")

  return (
    <AuthShell title="Escolha a empresa" description={`Conectado como ${user.email}.`}>
      <div className="flex flex-col divide-y rounded-lg border">
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={orgPath(organization.id, "/dashboard")}
            className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border font-semibold">
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <div className="grid flex-1 leading-tight">
              <span className="truncate font-medium">{organization.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {formatDocument(organization.document)} · {roleLabels[organization.role]}
              </span>
            </div>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
        <Button size="sm" nativeButton={false} render={<Link href="/orgs/new" />}>
          <PlusIcon />
          Nova empresa
        </Button>
      </div>
    </AuthShell>
  )
}
