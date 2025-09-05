import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DiagramEditor from "./DiagramEditor";
import EditorSidebar from "./EditorSidebar";
import { useState, useRef, useCallback } from "react";
import { Node, Edge, OnSelectionChangeParams, ReactFlowInstance } from "reactflow";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DiagramGallery from "./DiagramGallery";
import { BrainCircuit } from "lucide-react";
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

  const editorRef = useRef<{ 
    updateNode: (node: Node) => void; 
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: Edge) => void;
    deleteEdge: (edgeId: string) => void;
    addNode: (node: Node) => void;
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
    const newNode: Node = {
      id: `${tableName}-${+new Date()}`, type: 'table', position,
      data: {
        label: tableName,
        color: tableColors[Math.floor(Math.random() * tableColors.length)],
        columns: [{ id: `col_${Date.now()}`, name: 'id', type: 'INT', pk: true, nullable: false }],
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

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          {diagram ? (
            <EditorSidebar
              diagram={diagram}
              activeItemId={activeItemId}
              onActiveItemIdChange={setActiveItemId}
              onNodeUpdate={handleNodeUpdate}
              onNodeDelete={handleNodeDelete}
              onEdgeUpdate={handleEdgeUpdate}
              onEdgeDelete={handleEdgeDelete}
              onAddTable={handleAddTable}
              onDeleteDiagram={handleDeleteDiagram}
              onBackToGallery={() => setSelectedDiagramId(null)}
            />
          ) : (
            <div className="p-4 h-full flex items-center justify-center text-center bg-card">
              <div className="flex flex-col items-center gap-4">
                <BrainCircuit className="h-12 w-12 text-primary" />
                <h3 className="text-lg font-semibold">Database Designer</h3>
                <p className="text-muted-foreground">
                  Select a diagram from the gallery to start editing, or create a new one.
                </p>
              </div>
            </div>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
          <div className="flex h-full items-center justify-center relative">
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