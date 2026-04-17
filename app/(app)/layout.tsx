import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/nav/side-navbar/side-navbar";
import { NavigationControls } from "@/components/nav/controls/navigation-controls";
import { DynamicBreadcrumb } from "@/components/nav/dynamic-breadcrumb";
import { TooltipProvider } from "@/components/ui/tooltip"

export default function AppModuleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4 flex-row w-full">
              <NavigationControls className="hidden sm:flex" />
              <DynamicBreadcrumb className="flex-1 min-w-0" />
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-4 p-4">
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
