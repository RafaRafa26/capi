"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CopyIcon, LinkIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import {
  changeMemberRoleAction,
  inviteMemberAction,
  regenerateInvitationLinkAction,
  removeMemberAction,
  revokeInvitationAction,
} from "@/app/o/[orgId]/(app)/members/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import { roleLabels, type Role } from "@/modules/auth/permissions"
import type { Member, PendingInvitation } from "@/modules/members/types"

const roles: Role[] = ["ADMIN", "OPERATOR", "VIEWER"]

const roleDescriptions: Record<Role, string> = {
  ADMIN: "Tudo, inclusive gerenciar membros.",
  OPERATOR: "Lança, concilia e faz repasses.",
  VIEWER: "Só visualiza telas e relatórios.",
}

function invitationLink(token: string) {
  return `${window.location.origin}/invite/${token}`
}

function RoleSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as Role)} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue>{(current: Role) => roleLabels[current]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            <div className="flex flex-col">
              <span>{roleLabels[role]}</span>
              <span className="text-xs text-muted-foreground">{roleDescriptions[role]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Shows an invitation link with a copy button — there's no e-mail yet, the admin sends it. */
function InvitationLinkField({ link }: { link: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Link copiado.")
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.")
    }
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
      <Button type="button" variant="outline" onClick={copy}>
        <CopyIcon />
        Copiar
      </Button>
    </div>
  )
}

function InviteMemberDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [role, setRole] = React.useState<Role>("OPERATOR")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [link, setLink] = React.useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setLink(null)
      setError(null)
      setRole("OPERATOR")
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set("role", role)
    const result = await inviteMemberAction(form)

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setLink(invitationLink(result.data.token))
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Convidar pessoa
      </DialogTrigger>
      <DialogContent>
        {link ? (
          <>
            <DialogHeader>
              <DialogTitle>Convite criado</DialogTitle>
              <DialogDescription>
                Envie este link para a pessoa convidada. Ele vale por 7 dias e só funciona com o e-mail informado.
              </DialogDescription>
            </DialogHeader>
            <InvitationLinkField link={link} />
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Convidar pessoa</DialogTitle>
              <DialogDescription>
                Você receberá um link para enviar à pessoa — por WhatsApp, e-mail ou como preferir.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input id="invite-email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <RoleSelect value={role} onChange={setRole} className="w-full" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Gerando link..." : "Gerar link de convite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RemoveMemberDialog({ member }: { member: Member }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  async function handleRemove() {
    setPending(true)
    const result = await removeMemberAction(member.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${member.name} foi removido da empresa.`)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label={`Remover ${member.name}`} />}>
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover {member.name}?</DialogTitle>
          <DialogDescription>
            A pessoa perde o acesso a esta empresa imediatamente. A conta dela continua existindo e as outras
            empresas não são afetadas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={pending}>
            {pending ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemberRow({ member, isSelf, canManage }: { member: Member; isSelf: boolean; canManage: boolean }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleRoleChange(role: Role) {
    if (role === member.role) return
    setPending(true)
    const result = await changeMemberRoleAction(member.id, role)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Papel atualizado.")
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {member.name}
            {isSelf && <span className="font-normal text-muted-foreground"> (você)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-1">
            <RoleSelect value={member.role} onChange={handleRoleChange} disabled={pending} className="w-40" />
            <RemoveMemberDialog member={member} />
          </div>
        ) : (
          <Badge variant="secondary">{roleLabels[member.role]}</Badge>
        )}
      </CardContent>
    </Card>
  )
}

function InvitationRow({
  invitation,
  onLink,
}: {
  invitation: PendingInvitation
  onLink: (email: string, link: string) => void
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleNewLink() {
    setPending(true)
    const result = await regenerateInvitationLinkAction(invitation.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    onLink(invitation.email, invitationLink(result.data.token))
    router.refresh()
  }

  async function handleRevoke() {
    setPending(true)
    const result = await revokeInvitationAction(invitation.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Convite cancelado.")
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{invitation.email}</p>
            <Badge variant="secondary">{roleLabels[invitation.role]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {invitation.expired ? "Expirado" : `Válido até ${formatDate(invitation.expiresAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleNewLink} disabled={pending}>
            <LinkIcon />
            Novo link
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRevoke} disabled={pending} aria-label="Cancelar convite">
            <XIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function MembersView({
  members,
  invitations,
  currentUserId,
  canManage,
}: {
  members: Member[]
  invitations: PendingInvitation[]
  currentUserId: string
  canManage: boolean
}) {
  const [regenerated, setRegenerated] = React.useState<{ email: string; link: string } | null>(null)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {canManage && (
        <div className="flex items-center justify-start">
          <InviteMemberDialog />
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Membros</h2>
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.userId === currentUserId}
            canManage={canManage}
          />
        ))}
      </section>

      {canManage && invitations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Convites pendentes</h2>
          <p className="text-xs text-muted-foreground">
            Por segurança, o link só é exibido quando é gerado. Se a pessoa perdeu o link, gere um novo — o anterior
            deixa de valer.
          </p>
          {invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              onLink={(email, link) => setRegenerated({ email, link })}
            />
          ))}
        </section>
      )}

      <Dialog open={regenerated !== null} onOpenChange={(open) => !open && setRegenerated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo link de convite</DialogTitle>
            <DialogDescription>
              Envie este link para {regenerated?.email}. Ele vale por 7 dias; o link anterior não funciona mais.
            </DialogDescription>
          </DialogHeader>
          {regenerated && <InvitationLinkField link={regenerated.link} />}
          <DialogFooter>
            <Button type="button" onClick={() => setRegenerated(null)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
