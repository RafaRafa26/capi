import { NewBankAccountDialog } from "@/components/bank-accounts/new-bank-account-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatBRL, formatDate } from "@/lib/format"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listBankAccounts } from "@/modules/bank-accounts/service"

const kindLabel = { CHECKING: "Corrente", SAVINGS_POCKET: "Caixinha" } as const
const holderTypeLabel = { INDIVIDUAL: "Pessoa física", COMPANY: "Pessoa jurídica" } as const

export default async function BankAccountsPage() {
  const session = await requireSessionOrRedirect()
  const accounts = await listBankAccounts(session.organizationId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-start">
        <NewBankAccountDialog />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma conta cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{account.name}</p>
                    <Badge variant="secondary">{kindLabel[account.kind]}</Badge>
                    <Badge variant="outline">{holderTypeLabel[account.holderType]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {account.bank} · Ag {account.branchNumber} · Cc {account.accountNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Controle desde {formatDate(account.controlStartDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatBRL(account.initialBalance)}</p>
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
