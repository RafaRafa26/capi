import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatBRL, formatDate } from "@/lib/format"
import type { ResumoLancamentos } from "@/lib/mock/dashboard"

const secoes: {
  key: keyof ResumoLancamentos["buckets"]
  label: string
  dotClassName: string
}[] = [
  { key: "vencido", label: "Vencidas", dotClassName: "bg-red-500" },
  { key: "venceHoje", label: "Vence hoje", dotClassName: "bg-amber-500" },
  { key: "aVencer", label: "A vencer", dotClassName: "bg-muted-foreground" },
]

export function ReceivableCard({
  title,
  icon,
  resumo,
}: {
  title: string
  icon: React.ReactNode
  resumo: ResumoLancamentos
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vencido">
          <TabsList className="w-full">
            {secoes.map(({ key, label, dotClassName }) => (
              <TabsTrigger key={key} value={key} className="gap-2">
                <span className={`size-2 rounded-full ${dotClassName}`} />
                {label}
                <Badge variant="secondary">{resumo.buckets[key].count}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {secoes.map(({ key }) => {
            const bucket = resumo.buckets[key]
            return (
              <TabsContent key={key} value={key}>
                <ScrollArea className="h-72 pr-4">
                  <div className="space-y-4">
                    {bucket.itens.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.contato}</p>
                          <p className="truncate text-muted-foreground">
                            {formatDate(item.vencimento)} · {item.descricao}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium">
                          {formatBRL(item.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    Total: {formatBRL(bucket.total)}
                  </span>
                  <a
                    href="#"
                    className="font-medium text-primary hover:underline"
                  >
                    Ver todas →
                  </a>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
