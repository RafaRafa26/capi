import { CategoriesView } from "@/components/categories/categories-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listCategories } from "@/modules/categories/service"

export default async function CategoriesPage() {
  const session = await requireSessionOrRedirect()
  const categories = await listCategories(session.organizationId)

  return <CategoriesView categories={categories} />
}
