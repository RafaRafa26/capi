"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"

import { moveSubcategoryAction } from "@/app/(app)/categories/actions"
import { EditCategoryDialog } from "@/components/categories/edit-category-dialog"
import { NewCategoryDialog } from "@/components/categories/new-category-dialog"
import { NewSubcategoryDialog } from "@/components/categories/new-subcategory-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Category, CategoryType } from "@/modules/categories/types"

const sectionLabel: Record<CategoryType, string> = { INCOME: "Receitas", EXPENSE: "Despesas" }

function CategoryCard({ category, subcategories }: { category: Category; subcategories: Category[] }) {
  const [dragOver, setDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)

    const subcategoryId = event.dataTransfer.getData("text/plain")
    if (!subcategoryId) return

    const result = await moveSubcategoryAction(subcategoryId, category.id)
    setError(result.ok ? null : result.error)
  }

  return (
    <Card
      onDragOver={(event) => {
        event.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn("transition-colors", dragOver && "ring-2 ring-primary")}
    >
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{category.name}</p>
          <div className="flex items-center gap-1">
            <NewSubcategoryDialog parentId={category.id} />
            <EditCategoryDialog id={category.id} name={category.name} />
          </div>
        </div>

        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subcategories.map((subcategory) => (
              <div
                key={subcategory.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", subcategory.id)
                  event.dataTransfer.effectAllowed = "move"
                }}
                className="flex cursor-grab items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs active:cursor-grabbing"
              >
                <GripVerticalIcon className="size-3 text-muted-foreground" />
                {subcategory.name}
                <EditCategoryDialog id={subcategory.id} name={subcategory.name} />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

export function CategoriesView({ categories }: { categories: Category[] }) {
  const topLevel = categories.filter((c) => !c.parentId)
  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, Category[]>()
    for (const category of categories) {
      if (!category.parentId) continue
      map.set(category.parentId, [...(map.get(category.parentId) ?? []), category])
    }
    return map
  }, [categories])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-start">
        <NewCategoryDialog />
      </div>

      {(["INCOME", "EXPENSE"] as CategoryType[]).map((type) => {
        const categoriesOfType = topLevel.filter((c) => c.type === type)
        return (
          <div key={type} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{sectionLabel[type]}</h3>
            {categoriesOfType.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma categoria cadastrada ainda.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {categoriesOfType.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    subcategories={childrenByParent.get(category.id) ?? []}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
