"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function chipLabel(label: string, selected: string[]): string {
  if (selected.length === 0) return label
  if (selected.length === 1) return `${label}: ${selected[0]}`
  return `${label}: ${selected.length} selecionados`
}

export function FilterChip({
  label,
  options,
  selected,
  open,
  onOpenChange,
  onApply,
  onRemove,
  allowSelectAll = false,
}: {
  label: string
  options: string[]
  selected: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (values: string[]) => void
  onRemove: () => void
  allowSelectAll?: boolean
}) {
  const [draft, setDraft] = React.useState<string[]>(selected)
  const [query, setQuery] = React.useState("")
  const appliedRef = React.useRef(false)

  const filteredOptions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) => option.toLowerCase().includes(normalized))
  }, [options, query])

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(selected)
      setQuery("")
      appliedRef.current = false
    } else if (!appliedRef.current && selected.length === 0) {
      onRemove()
    }
    onOpenChange(next)
  }

  function toggleValue(value: string) {
    setDraft((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  const allSelected = options.length > 0 && options.every((option) => draft.includes(option))

  function toggleAll() {
    setDraft(allSelected ? [] : [...options])
  }

  function handleApply() {
    appliedRef.current = true
    onApply(draft)
    onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <span
            className={cn(
              "flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
              selected.length > 0 ? "border-border bg-muted" : "border-dashed border-border bg-transparent",
            )}
          />
        }
      >
        <button type="button" className="cursor-pointer">
          {chipLabel(label, selected)}
        </button>
        <button
          type="button"
          aria-label={`Remover filtro ${label}`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-70 gap-2 p-2">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-7"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex max-h-55 flex-col gap-0.5 overflow-y-auto">
          {allowSelectAll && filteredOptions.length > 0 && (
            <label className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span className="truncate font-medium">Todos</span>
            </label>
          )}
          {filteredOptions.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">Nada encontrado.</p>
          ) : (
            filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox checked={draft.includes(option)} onCheckedChange={() => toggleValue(option)} />
                <span className="truncate">{option}</span>
              </label>
            ))
          )}
        </div>
        <Button className="w-full" onClick={handleApply}>
          Aplicar
        </Button>
      </PopoverContent>
    </Popover>
  )
}
