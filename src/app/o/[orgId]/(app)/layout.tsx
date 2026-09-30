import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { HideValuesButton, HideValuesProvider } from "@/components/overview/hide-values";
import { PageTitle } from "@/components/page-title";
import { RegisterMenu } from "@/components/register-menu";
import { RememberOrganization } from "@/components/remember-organization";
import { Separator } from "@/components/ui/separator";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { can } from "@/modules/auth/permissions";
import { requireSessionOrRedirect } from "@/modules/auth/session";
import { listUserOrganizations } from "@/modules/organizations/service";

export default async function AppLayout({ children }: LayoutProps<"/o/[orgId]">) {
  const session = await requireSessionOrRedirect();
  const [organizations, jar] = await Promise.all([listUserOrganizations(session.userId), cookies()]);
  const sidebarState = jar.get(SIDEBAR_COOKIE_NAME)?.value;

  return (
    <TooltipProvider>
      <RememberOrganization organizationId={session.organizationId} />
      <SidebarProvider defaultOpen={sidebarState !== "false"} className="h-svh overflow-hidden">
        <AppSidebar
          organizationId={session.organizationId}
          organizations={organizations}
          userName={session.name}
          userEmail={session.email}
        />
        <SidebarInset className="overflow-y-auto">
          <HideValuesProvider>
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 rounded-t-xl border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                />
                <PageTitle />
              </div>
              <div className="flex items-center gap-2 px-4">
                <HideValuesButton />
                {can(session.role, "write") && <RegisterMenu />}
              </div>
            </header>
            {children}
          </HideValuesProvider>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
