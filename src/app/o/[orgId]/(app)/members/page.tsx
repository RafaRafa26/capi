import { MembersView } from "@/components/members/members-view"
import { can } from "@/modules/auth/permissions"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listMembers } from "@/modules/members/service"

export default async function MembersPage() {
  const session = await requireSessionOrRedirect()
  const { members, invitations } = await listMembers(session.organizationId)

  return (
    <MembersView
      members={members}
      invitations={invitations}
      currentUserId={session.userId}
      canManage={can(session.role, "manageMembers")}
    />
  )
}
