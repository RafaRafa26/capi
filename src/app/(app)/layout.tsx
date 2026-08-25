import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Porta única de entrada da área logada: sem sessão, ninguém passa daqui.
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
