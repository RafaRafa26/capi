import { OverviewView } from "@/components/overview/overview-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { getOverview } from "@/modules/dashboard/service"

export default async function DashboardPage() {
  const session = await requireSessionOrRedirect()
  const data = await getOverview(session.organizationId)

  return <OverviewView data={data} />
}
