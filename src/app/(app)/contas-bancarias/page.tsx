import { ContasBancariasTable } from "@/components/contas-bancarias/contas-bancarias-table";
import { contasBancarias } from "@/lib/mock-data/contas-bancarias";

export default function ContasBancariasPage() {
  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Contas bancárias</h1>
      <ContasBancariasTable contas={contasBancarias} />
    </div>
  );
}
