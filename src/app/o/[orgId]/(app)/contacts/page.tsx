import { ContactsView } from "@/components/contacts/contacts-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listContacts } from "@/modules/contacts/service"

export default async function ContactsPage() {
  const session = await requireSessionOrRedirect()
  const contacts = await listContacts(session.organizationId)

  return <ContactsView contacts={contacts} />
}
