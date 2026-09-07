import { NewContactDialog } from "@/components/contacts/new-contact-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listContacts } from "@/modules/contacts/service"

const personTypeLabel = {
  INDIVIDUAL: "Pessoa física",
  COMPANY: "Pessoa jurídica",
} as const

export default async function ContactsPage() {
  const session = await requireSessionOrRedirect()
  const contacts = await listContacts(session.organizationId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contatos</h2>
        <NewContactDialog />
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum contato cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.document} · {personTypeLabel[contact.personType]}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {contact.email && <p>{contact.email}</p>}
                  {contact.phone && <p>{contact.phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
