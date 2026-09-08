import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { PageTitle } from "@/components/page-title";
import { RegisterMenu } from "@/components/register-menu";
import { Separator } from "@/components/ui/separator";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireSessionOrRedirect } from "@/modules/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSessionOrRedirect();
  const sidebarState = (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value;

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarState !== "false"}>
        <AppSidebar
          organizationName={session.organizationName}
          organizationDocument={session.organizationDocument}
          userName={session.name}
          userEmail={session.email}
        />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 rounded-t-xl border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <PageTitle />
            </div>
            <div className="px-4">
              <RegisterMenu />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
