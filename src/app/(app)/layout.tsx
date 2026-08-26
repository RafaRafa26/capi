import { AppSidebar } from "@/components/app-sidebar";
import { FaixaDemo } from "@/components/faixa-demo";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Com acesso livre, isto sempre resolve: sessão do cookie, admin padrão do
  // banco, ou — sem banco — a sessão fictícia do modo demonstração.
  const sessao = await exigirSessaoOuRedirecionar();

  return (
    <div className="flex min-h-svh flex-col">
      <FaixaDemo />
      <SidebarProvider className="min-h-0 flex-1">
        <AppSidebar
          usuario={{ nome: sessao.nome, email: sessao.email }}
          organizacao={{
            nome: sessao.organizacaoNome,
            documento: sessao.organizacaoDocumento,
          }}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </div>
  );
}
