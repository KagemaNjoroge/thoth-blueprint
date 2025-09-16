import { useEffect, useRef, useState } from "react";
import { type ImperativePanelHandle } from "react-resizable-panels";

export function useSidebarState() {
  const [sidebarState, setSidebarState] = useState<"docked" | "hidden">(
    "docked"
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);

  const isSidebarVisible = sidebarState === "docked";

  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (panel) {
      if (isSidebarVisible) {
        if (panel.isCollapsed()) {
          panel.expand();
        }
      } else {
        if (!panel.isCollapsed()) {
          panel.collapse();
        }
      }
    }
  }, [isSidebarVisible]);

  const handleOpenSidebar = () => {
    if (sidebarState === "hidden") {
      setSidebarState("docked");
    } else {
      sidebarPanelRef.current?.expand();
    }
  };

  return {
    sidebarState,
    setSidebarState,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarPanelRef,
    isSidebarVisible,
    handleOpenSidebar,
  };
}
