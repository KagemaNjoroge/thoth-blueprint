import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import DiagramEditor from "./DiagramEditor";
import EditorSidebar from "./EditorSidebar";
import { useState, useRef, useCallback, useEffect } from "react";
import { Node, Edge, OnSelectionChangeParams, ReactFlowInstance } from "reactflow";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DiagramGallery from "./DiagramGallery";
import { AddTableDialog } from "./AddTableDialog";

const tableColors = [
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', 
  '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#4ADE80',
];

export default function Layout() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<'docked' | 'hidden'>('docked');

  const editorRef = useRef<{ 
    updateNode: (node: Node) => void; 
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: Edge) => void;
    deleteEdge: (edgeId: string) => void;
    addNode: (node: Node) => void;
    undoDelete: () => void;
    batchUpdateNodes: (nodes: Node[]) => void;
  }>(null);

  const diagram = useLiveQuery(() => 
    selectedDiagramId ? db.diagrams.get(selectedDiagramId) : undefined,
    [selectedDiagramId]
  );

  const handleNodeUpdate = useCallback((node: Node) => {
    editorRef.current?.updateNode(node);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    editorRef.current?.deleteNode(nodeId);
    setActiveItemId(null);
  }, []);

  const handleEdgeUpdate = useCallback((edge: Edge) => {
    editorRef.current?.updateEdge(edge);
  }, []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    editorRef.current?.deleteEdge(edgeId);
    setActiveItemId(null);
  }, []);

  const handleSelectionChange = useCallback(({ nodes, edges }: OnSelectionChangeParams) => {
    if (nodes.length === 1 && edges.length === 0) {
      setActiveItemId(nodes[0].id);
    } else if (edges.length === 1 && nodes.length === 0) {
      setActiveItemId(edges[0].id);
    } else {
      setActiveItemId(null);
    }
  }, []);

  const handleAddTable = () => setIsAddTableDialogOpen(true);

  const handleCreateTable = (tableName: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.project({ x: window.innerWidth * 0.6, y: window.innerHeight / 2 });
      position = { x: flowPosition.x - 128, y: flowPosition.y - 50 };
    }
    const visibleNodes = diagram?.data.nodes.filter(n => !n.data.isDeleted) || [];
    const newNode: Node = {
      id: `${tableName}-${+new Date()}`, type: 'table', position,
      data: {
        label: tableName,
        color: tableColors[Math.floor(Math.random() * tableColors.length)],
        columns: [{ id: `col_${Date.now()}`, name: 'id', type: 'INT', pk: true, nullable: false }],
        order: visibleNodes.length,
      },
    };
    editorRef.current?.addNode(newNode);
  };

  const handleDeleteDiagram = async () => {
    if (diagram && confirm("Are you sure you want to delete this diagram? This action cannot be undone.")) {
      await db.diagrams.delete(diagram.id!);
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
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
          return;
        }

        if ((event.ctrlKey || event.metaKey) && (event.key === 'n' || event.key === 'a')) {
          event.preventDefault();
          if (!isAddTableDialogOpen) {
            handleAddTable();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDiagramId, isAddTableDialogOpen]);

  const handleBatchNodeUpdate = useCallback((nodesToUpdate: Node[]) => {
    editorRef.current?.batchUpdateNodes(nodesToUpdate);
  }, []);

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
    />
  ) : null;

  return (
    <>
      <div className="lg:hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[350px] sm:w-[400px] flex">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full">
        {diagram && sidebarState === 'docked' && (
          <>
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="hidden lg:block">
              {sidebarContent}
            </ResizablePanel>
            <ResizableHandle withHandle className="hidden lg:flex" />
          </>
        )}
        <ResizablePanel defaultSize={diagram && sidebarState === 'docked' ? 75 : 100}>
          <div className="flex h-full items-center justify-center relative">
            {diagram && (
              <div className="absolute top-4 left-4 z-10 lg:hidden">
                <Button size="icon" variant="outline" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}
            
            {diagram && sidebarState === 'hidden' && (
              <div className="absolute top-4 left-4 z-10 hidden lg:block">
                <Button size="icon" variant="outline" onClick={() => setSidebarState('docked')}>
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}

            {selectedDiagramId && diagram ? (
              <DiagramEditor 
                ref={editorRef}
                diagram={diagram}
                onSelectionChange={handleSelectionChange}
                setRfInstance={setRfInstance}
              />
            ) : (
              <DiagramGallery setSelectedDiagramId={setSelectedDiagramId} />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <AddTableDialog isOpen={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen} onCreateTable={handleCreateTable} />
    </>
  );
}