import { MarkersView } from "@/components/markers/markers-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listMarkers } from "@/modules/markers/service"

export default async function MarkersPage() {
  const session = await requireSessionOrRedirect()
  const markers = await listMarkers(session.organizationId)

  return <MarkersView markers={markers} />
}
