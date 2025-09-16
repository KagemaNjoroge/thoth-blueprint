import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { type Diagram } from "@/lib/types";
import { type ImperativePanelHandle } from "react-resizable-panels";

interface DiagramLayoutProps {
  sidebarContent: ReactNode;
  diagramContent: ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  handleOpenSidebar: () => void;
  isSidebarCollapsed: boolean;
  diagram: Diagram | undefined;
  sidebarPanelRef: RefObject<ImperativePanelHandle>;
  onCollapse: () => void;
  onExpand: () => void;
}

export function DiagramLayout({
  sidebarContent,
  diagramContent,
  isSidebarOpen,
  setIsSidebarOpen,
  handleOpenSidebar,
  isSidebarCollapsed,
  diagram,
  sidebarPanelRef,
  onCollapse,
  onExpand,
}: DiagramLayoutProps) {
  return (
    <>
      <div className="lg:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[350px] sm:w-[400px] flex">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-screen w-full"
        autoSaveId="sidebar-layout"
      >
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={25}
          collapsible
          collapsedSize={0}
          minSize={20}
          maxSize={40}
          className="hidden lg:block"
          onCollapse={onCollapse}
          onExpand={onExpand}
        >
          {sidebarContent}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className={cn("hidden lg:flex", isSidebarCollapsed && "hidden")}
        />
        <ResizablePanel defaultSize={75}>
          <div className="flex h-full items-center justify-center relative">
            {diagram && (
              <div className="absolute top-4 left-4 z-10 lg:hidden">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}

            {diagram && isSidebarCollapsed && (
              <div className="absolute top-4 left-4 z-10 hidden lg:block">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleOpenSidebar}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}

            {diagramContent}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}