import { Info } from "lucide-react";

import { modoDemo } from "@/modules/demo/modo";

/**
 * Faixa do modo demonstração.
 *
 * Sem ela, dados de exemplo passariam por reais — o pior mal-entendido
 * possível num sistema que mostra saldo de dinheiro de terceiros.
 */
export async function FaixaDemo() {
  if (!(await modoDemo())) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-[#fed7aa] bg-[#fff7ed] px-4 py-2 text-center text-[13px] text-[#9a3412] dark:border-[#7c2d12] dark:bg-[#2a1608] dark:text-[#fdba74]">
      <Info className="size-4 shrink-0" />
      <span className="font-semibold">Modo demonstração.</span>
      <span>
        Os dados desta tela são de exemplo e nada é salvo — configure o banco de
        dados para usar de verdade.
      </span>
    </div>
  );
}
