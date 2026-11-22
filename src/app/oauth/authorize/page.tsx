import { redirect } from "next/navigation"
import { EyeIcon, ShieldCheckIcon } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { roleLabels } from "@/modules/auth/permissions"
import { currentUser } from "@/modules/auth/session"
import { parseAuthorizationRequest } from "@/modules/oauth/service"
import { listUserOrganizations } from "@/modules/organizations/service"
import { decideAuthorizationAction } from "./actions"

export const metadata = { title: "Autorizar acesso · Capi" }

// OAuth consent: claude.ai sends the person here when the Capi connector is
// added. They sign in (if needed), see what Claude will be able to do, and
// allow or refuse.
export default async function AuthorizePage({ searchParams }: PageProps<"/oauth/authorize">) {
  const raw = await searchParams
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, typeof value === "string" ? value : undefined]),
  )

  const user = await currentUser()
  if (!user) {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
    )
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${query}`)}`)
  }

  const parsed = await parseAuthorizationRequest(params)
  if (!parsed.ok) {
    if (parsed.redirect) redirect(parsed.redirect)
    return (
      <AuthShell title="Não foi possível autorizar" description={parsed.error}>
        <p className="text-sm text-muted-foreground">Volte ao Claude e tente conectar o Capi novamente.</p>
      </AuthShell>
    )
  }

  const { request } = parsed
  const organizations = await listUserOrganizations(user.userId)
  const redirectHost = new URL(request.redirectUri).host

  return (
    <AuthShell
      title={`Conectar ${request.clientName} ao Capi`}
      description={
        <>
          Conectado como <span className="font-medium text-foreground">{user.email}</span>. O acesso vale para as
          empresas abaixo, com o mesmo papel que você tem em cada uma.
        </>
      }
    >
      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex gap-3">
          <EyeIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-medium">Somente leitura.</span> Consultar lançamentos, extratos, saldos, contatos e
            repasses. Não cria, altera nem exclui nada.
          </span>
        </li>
        <li className="flex gap-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Para parar, remova o conector no Claude. O acesso expira sozinho após 30 dias sem uso, e perder o
            acesso a uma empresa no Capi corta o acesso dela na hora.
          </span>
        </li>
      </ul>

      <div className="flex flex-col divide-y rounded-lg border">
        {organizations.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted-foreground">Você ainda não participa de nenhuma empresa.</p>
        ) : (
          organizations.map((organization) => (
            <div key={organization.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate font-medium">{organization.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{roleLabels[organization.role]}</span>
            </div>
          ))
        )}
      </div>

      <form action={decideAuthorizationAction} className="flex flex-col gap-3">
        <input type="hidden" name="client_id" value={request.clientId} />
        <input type="hidden" name="redirect_uri" value={request.redirectUri} />
        <input type="hidden" name="code_challenge" value={request.codeChallenge} />
        <input type="hidden" name="scope" value={request.scope} />
        {request.state && <input type="hidden" name="state" value={request.state} />}
        <div className="flex gap-2">
          <Button type="submit" name="decision" value="deny" variant="outline" className="h-10 flex-1">
            Recusar
          </Button>
          <Button type="submit" name="decision" value="allow" className="h-10 flex-1">
            Permitir
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">Você voltará para {redirectHost}.</p>
      </form>
    </AuthShell>
  )
}
