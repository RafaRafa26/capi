import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Com acesso livre, isto sempre resolve: sessão do cookie, admin padrão do
  // banco, ou — sem banco — a sessão fictícia do modo demonstração.
  const sessao = await exigirSessaoOuRedirecionar();

  return (
    <SidebarProvider>
      <AppSidebar
        usuario={{ nome: sessao.nome, email: sessao.email }}
        organizacao={{
          nome: sessao.organizacaoNome,
          documento: sessao.organizacaoDocumento,
        }}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
