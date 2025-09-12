import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { tableColors } from "@/lib/colors";
import { db } from "@/lib/db";
import { type AppEdge, type AppNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useLiveQuery } from "dexie-react-hooks";
import { Menu } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { AddTableDialog } from "./AddTableDialog";
import DiagramEditor from "./DiagramEditor";
import DiagramGallery from "./DiagramGallery";
import EditorSidebar from "./EditorSidebar";
import { ExportDialog } from "./ExportDialog";
import { PWAUpdateNotification } from "./PWAUpdateNotification";
import { UpdateDialog } from "./UpdateDialog";

export default function Layout() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(
    null
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<
    AppNode,
    AppEdge
  > | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<"docked" | "hidden">(
    "docked"
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);

  const editorRef = useRef<{
    updateNode: (node: AppNode) => void;
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: AppEdge) => void;
    deleteEdge: (edgeId: string) => void;
    addNode: (node: AppNode) => void;
    undoDelete: () => void;
    batchUpdateNodes: (nodes: AppNode[]) => void;
  }>(null);

  // Load selected diagram ID on mount
  useEffect(() => {
    const loadSelectedDiagram = async () => {
      try {
        const state = await db.appState.get('selectedDiagramId');
        if (state && typeof state.value === 'number') {
          const diagramExists = await db.diagrams.get(state.value);
          if (diagramExists && !diagramExists.deletedAt) {
            setSelectedDiagramId(state.value);
          } else {
            await db.appState.delete('selectedDiagramId');
          }
        }
      } catch (error) {
        console.error("Failed to load selected diagram:", error);
      }
    };
    loadSelectedDiagram();
  }, []);

  // Save selected diagram ID when it changes
  useEffect(() => {
    const saveSelectedDiagram = async () => {
      try {
        if (selectedDiagramId !== null) {
          await db.appState.put({ key: 'selectedDiagramId', value: selectedDiagramId });
        } else {
          const state = await db.appState.get('selectedDiagramId');
          if (state) {
            await db.appState.delete('selectedDiagramId');
          }
        }
      } catch (error) {
        console.error("Failed to save selected diagram:", error);
      }
    };
    saveSelectedDiagram();
  }, [selectedDiagramId]);

  const diagram = useLiveQuery(
    () => (selectedDiagramId ? db.diagrams.get(selectedDiagramId) : undefined),
    [selectedDiagramId]
  );

  const isSidebarVisible = diagram && sidebarState === "docked";

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

  const handleNodeUpdate = useCallback((node: AppNode) => {
    editorRef.current?.updateNode(node);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    editorRef.current?.deleteNode(nodeId);
    setActiveItemId(null);
  }, []);

  const handleEdgeUpdate = useCallback((edge: AppEdge) => {
    editorRef.current?.updateEdge(edge);
  }, []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    editorRef.current?.deleteEdge(edgeId);
    setActiveItemId(null);
  }, []);

  const handleSelectionChange = useCallback(
    ({ nodes, edges }: OnSelectionChangeParams) => {
      if (nodes.length === 1 && edges.length === 0 && nodes[0]) {
        setActiveItemId(nodes[0].id);
        setSelectedNodeId(nodes[0].id);
        setSelectedEdgeId(null);
      } else if (edges.length === 1 && nodes.length === 0 && edges[0]) {
        setActiveItemId(edges[0].id);
        setSelectedNodeId(null);
        setSelectedEdgeId(edges[0].id);
      } else {
        setActiveItemId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    []
  );

  const handleAddTable = () => setIsAddTableDialogOpen(true);

  const handleCreateTable = (tableName: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({
        x: window.innerWidth * 0.6,
        y: window.innerHeight / 2,
      });
      position = { x: flowPosition.x - 144, y: flowPosition.y - 50 };
    }
    const visibleNodes =
      diagram?.data.nodes.filter((n) => !n.data.isDeleted) || [];
    const newNode: AppNode = {
      id: `${tableName}-${+new Date()}`,
      type: "table",
      position,
      data: {
        label: tableName,
        color:
          tableColors[Math.floor(Math.random() * tableColors.length)] ??
          "#60A5FA",
        columns: [
          {
            id: `col_${Date.now()}`,
            name: "id",
            type: "INT",
            pk: true,
            nullable: false,
          },
        ],
        order: visibleNodes.length,
      },
    };
    editorRef.current?.addNode(newNode);
  };

  const handleCreateTableAtPosition = useCallback((position: { x: number; y: number }) => {
    if (!diagram) return;
    const visibleNodes = diagram.data.nodes.filter(n => !n.data.isDeleted) || [];
    const tableName = `new_table_${visibleNodes.length + 1}`;

    // Center the node on the cursor position
    const nodeWidth = 288; // As defined in TableNode.tsx
    const nodeHeight = 100; // Approximate default height
    const adjustedPosition = {
      x: position.x - nodeWidth / 2,
      y: position.y - nodeHeight / 2,
    };

    const newNode: AppNode = {
      id: `${tableName}-${+new Date()}`,
      type: 'table',
      position: adjustedPosition,
      data: {
        label: tableName,
        color: tableColors[Math.floor(Math.random() * tableColors.length)] ?? '#60A5FA',
        columns: [
          { id: `col_${Date.now()}`, name: 'id', type: 'INT', pk: true, nullable: false },
        ],
        order: visibleNodes.length,
      },
    };
    editorRef.current?.addNode(newNode);
  }, [diagram]);

  const handleDeleteDiagram = async () => {
    if (diagram) {
      await db.diagrams.update(diagram.id!, { deletedAt: new Date(), updatedAt: new Date() });
      setSelectedDiagramId(null);
    }
  };

  const handleUndoDelete = useCallback(() => {
    editorRef.current?.undoDelete();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedDiagramId) {
        const target = event.target as HTMLElement;
        if (
          ["INPUT", "TEXTAREA"].includes(target.tagName) ||
          target.isContentEditable
        ) {
          return;
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          (event.key === "n" || event.key === "a")
        ) {
          event.preventDefault();
          if (!isAddTableDialogOpen) {
            handleAddTable();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDiagramId, isAddTableDialogOpen]);

  const handleBatchNodeUpdate = useCallback((nodesToUpdate: AppNode[]) => {
    editorRef.current?.batchUpdateNodes(nodesToUpdate);
  }, []);

  const handleSetRfInstance = useCallback(
    (instance: ReactFlowInstance<AppNode, AppEdge> | null) => {
      setRfInstance(instance);
    },
    []
  );

  const handleOpenSidebar = () => {
    if (sidebarState === 'hidden') {
      setSidebarState('docked');
    } else {
      sidebarPanelRef.current?.expand();
    }
  };

  const isLocked = diagram?.data?.isLocked ?? false;

  const sidebarContent = diagram ? (
    <EditorSidebar
      diagram={diagram}
      activeItemId={activeItemId}
      onActiveItemIdChange={(id) => {
        setActiveItemId(id);
      }}
      onNodeUpdate={handleNodeUpdate}
      onNodeDelete={handleNodeDelete}
      onEdgeUpdate={handleEdgeUpdate}
      onEdgeDelete={handleEdgeDelete}
      onAddTable={() => {
        handleAddTable();
        setIsSidebarOpen(false);
      }}
      onDeleteDiagram={handleDeleteDiagram}
      onBackToGallery={() => {
        setSelectedDiagramId(null);
        setIsSidebarOpen(false);
      }}
      onUndoDelete={handleUndoDelete}
      onBatchNodeUpdate={handleBatchNodeUpdate}
      isLocked={isLocked}
      onSetSidebarState={setSidebarState}
      onExport={() => setIsExportDialogOpen(true)}
      onCheckForUpdate={() => setIsUpdateDialogOpen(true)}
    />
  ) : null;

  return (
    <>
      <PWAUpdateNotification onUpdateNow={() => setIsUpdateDialogOpen(true)} />
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
          onCollapse={() => setIsSidebarCollapsed(true)}
          onExpand={() => setIsSidebarCollapsed(false)}
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

            {selectedDiagramId && diagram ? (
              <DiagramEditor
                ref={editorRef}
                diagram={diagram}
                onSelectionChange={handleSelectionChange}
                setRfInstance={handleSetRfInstance}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onCreateTableAtPosition={handleCreateTableAtPosition}
              />
            ) : (
              <DiagramGallery setSelectedDiagramId={setSelectedDiagramId} />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <AddTableDialog
        isOpen={isAddTableDialogOpen}
        onOpenChange={setIsAddTableDialogOpen}
        onCreateTable={handleCreateTable}
      />
      <ExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        diagram={diagram}
        rfInstance={rfInstance as ReactFlowInstance | null}
      />
      <UpdateDialog
        isOpen={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
      />
    </>
  );
}