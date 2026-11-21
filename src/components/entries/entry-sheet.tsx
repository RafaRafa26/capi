"use client"

import * as React from "react"

import { loadEntryOptionsAction, type EntryOptions } from "@/app/o/[orgId]/(app)/entries/actions"
import { EntryForm } from "@/components/entries/entry-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { EntryKind } from "@/lib/entries/draft"

interface EntrySheetContextValue {
  openEntry: (kind: EntryKind) => void
}

const EntrySheetContext = React.createContext<EntrySheetContextValue | null>(null)

export function useEntrySheet(): EntrySheetContextValue {
  const context = React.useContext(EntrySheetContext)
  if (!context) throw new Error("useEntrySheet must be used inside EntrySheetProvider.")
  return context
}

// Single-letter shortcuts only fire when nothing that takes text or keys
// has focus and no other dialog is open.
const SHORTCUT_BLOCKERS = 'input, textarea, select, [contenteditable="true"], [role="menu"], [role="listbox"]'

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || target.closest(SHORTCUT_BLOCKERS) !== null)
}

/**
 * Owns the "Registrar" sheet for the whole organization area, so it opens
 * over whatever screen the user is on and closes back to it. V and D open it
 * as venda or despesa from anywhere.
 */
export function EntrySheetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [kind, setKind] = React.useState<EntryKind>("sale")
  // Bumped on every open so the form always starts from a fresh draft.
  const [formKey, setFormKey] = React.useState(0)
  const [options, setOptions] = React.useState<EntryOptions | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false)

  const loadingRef = React.useRef(false)
  const loadedRef = React.useRef(false)
  // Whether this opening of the sheet already asked the server for the lists.
  const requestedRef = React.useRef(false)
  const dirtyRef = React.useRef(false)
  const amountRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    let ok = false
    try {
      const result = await loadEntryOptionsAction()
      ok = result.ok
      if (result.ok) {
        loadedRef.current = true
        setOptions(result.data)
        setLoadError(null)
      } else if (!loadedRef.current) {
        setLoadError(result.error)
      }
    } catch {
      // The request itself failed (network, or the server restarting
      // mid-deploy) rather than returning an error. Lists already loaded
      // stay usable; without them the sheet offers to try again.
      if (!loadedRef.current) setLoadError("Sem conexão com o servidor.")
    } finally {
      loadingRef.current = false
      // A failed request is retried the next time a selector opens.
      if (!ok) requestedRef.current = false
    }
  }, [])

  /**
   * Called when a selector (cliente, categoria, conta, favorecido) opens:
   * the lists are fetched then, once per opening of the sheet, never just
   * for opening it. Lists fetched on an earlier opening show meanwhile.
   */
  const requestOptions = React.useCallback(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    void load()
  }, [load])

  const openEntry = React.useCallback(
    (next: EntryKind) => {
      dirtyRef.current = false
      setKind(next)
      setFormKey((key) => key + 1)
      setOpen(true)
      // The next selector opened fetches fresh lists, so contacts or
      // accounts created on other screens show up.
      requestedRef.current = false
    },
    [],
  )

  const requestClose = React.useCallback(() => {
    if (dirtyRef.current) setConfirmingDiscard(true)
    else setOpen(false)
  }, [])

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== "v" && key !== "d") return
      if (isTypingTarget(event.target) || document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      openEntry(key === "v" ? "sale" : "expense")
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openEntry])

  const contextValue = React.useMemo(() => ({ openEntry }), [openEntry])
  const handleDirtyChange = React.useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])
  const handleOptionsChange = React.useCallback((update: (current: EntryOptions) => EntryOptions) => {
    setOptions((current) => (current ? update(current) : current))
  }, [])

  return (
    <EntrySheetContext.Provider value={contextValue}>
      {children}

      <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-black/45"
          initialFocus={amountRef}
          className="flex h-full w-full flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
        >
          <EntryForm
            key={formKey}
            initialKind={kind}
            options={options}
            loadError={loadError}
            amountRef={amountRef}
            onRetryLoad={() => void load()}
            onRequestOptions={requestOptions}
            onOptionsChange={handleOptionsChange}
            onDirtyChange={handleDirtyChange}
            onClose={requestClose}
            onSaved={() => {
              dirtyRef.current = false
              setOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Descartar lançamento?</DialogTitle>
            <DialogDescription>O que você preencheu neste lançamento será perdido.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDiscard(false)}>
              Continuar editando
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                dirtyRef.current = false
                setConfirmingDiscard(false)
                setOpen(false)
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EntrySheetContext.Provider>
  )
}
