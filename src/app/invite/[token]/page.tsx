import Link from "next/link"

import { signOutAction } from "@/app/(auth)/login/actions"
import { AuthShell } from "@/components/auth/auth-shell"
import { AcceptInvitationButton } from "@/components/members/accept-invitation-button"
import { Button } from "@/components/ui/button"
import { roleLabels } from "@/modules/auth/permissions"
import { currentUser } from "@/modules/auth/session"
import { getInvitationPreview } from "@/modules/members/service"

const unavailable = {
  ACCEPTED: "Este convite já foi usado.",
  REVOKED: "Este convite foi cancelado por um administrador da empresa.",
  EXPIRED: "Este convite expirou. Peça um novo link a quem te convidou.",
} as const

function Unavailable({ message }: { message: string }) {
  return (
    <AuthShell title="Convite indisponível" description={message}>
      <Button nativeButton={false} variant="outline" render={<Link href="/" />}>
        Ir para o Capi
      </Button>
    </AuthShell>
  )
}

export default async function InvitationPage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params
  const [invitation, user] = await Promise.all([getInvitationPreview(token), currentUser()])

  if (!invitation) return <Unavailable message="Este link de convite não é válido." />
  if (invitation.status !== "PENDING") return <Unavailable message={unavailable[invitation.status]} />

  const here = `/invite/${token}`
  const description = (
    <>
      Você foi convidado para entrar em <strong className="text-foreground">{invitation.organizationName}</strong>{" "}
      como <strong className="text-foreground">{roleLabels[invitation.role].toLowerCase()}</strong>.
    </>
  )

  if (!user) {
    return (
      <AuthShell title="Convite" description={description}>
        <p className="text-sm text-muted-foreground">
          O convite foi enviado para <span className="font-medium text-foreground">{invitation.email}</span>. Crie
          uma conta com esse e-mail ou entre, se já tiver uma.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(invitation.email)}`}
              />
            }
          >
            Criar conta
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/login?next=${encodeURIComponent(here)}`} />}
          >
            Já tenho conta
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (user.email !== invitation.email) {
    return (
      <AuthShell title="Convite" description={description}>
        <p className="text-sm text-muted-foreground">
          Este convite foi enviado para <span className="font-medium text-foreground">{invitation.email}</span>, mas
          você está conectado como <span className="font-medium text-foreground">{user.email}</span>. Saia e entre
          com a conta certa para aceitá-lo.
        </p>
        <form action={signOutAction}>
          <input type="hidden" name="next" value={here} />
          <Button type="submit" variant="outline" className="w-full">
            Sair e entrar com outra conta
          </Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Convite" description={description}>
      <AcceptInvitationButton token={token} />
    </AuthShell>
  )
}
