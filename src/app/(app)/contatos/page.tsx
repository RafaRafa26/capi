import { ContatosTable } from "@/components/contatos/contatos-table";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarContatos } from "@/modules/contatos/servico";

export default async function ContatosPage() {
  const sessao = await exigirSessaoOuRedirecionar();
  const contatos = await listarContatos(sessao.organizacaoId);

  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Contatos</h1>
      <ContatosTable contatos={contatos} />
    </div>
  );
}
