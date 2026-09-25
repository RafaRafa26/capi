"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Prints the page via the browser's dialog — the vehicle for "Exportar PDF" too, since choosing "Salvar como PDF" there is a real export, not a screenshot. */
export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <PrinterIcon />
      {label}
    </Button>
  )
}
