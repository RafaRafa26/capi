import { HardHatIcon } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <HardHatIcon className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold">Página em construção</p>
        <p className="text-sm text-muted-foreground">
          Acesse a barra lateral para conhecer as outras telas já disponíveis.
        </p>
      </div>
    </div>
  )
}
