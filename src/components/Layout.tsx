import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DiagramEditor from "./DiagramEditor";
import NodeInspectorPanel from "./NodeInspectorPanel";
import EdgeInspectorPanel from "./EdgeInspectorPanel";
import { useState, useRef, useCallback } from "react";
import { Node, Edge, OnSelectionChangeParams } from "reactflow";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DiagramGallery from "./DiagramGallery";

export default function Layout() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const editorRef = useRef<{ 
    updateNode: (node: Node) => void; 
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: Edge) => void;
    deleteEdge: (edgeId: string) => void;
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
    setSelectedNode(null);
  }, []);

  const handleEdgeUpdate = useCallback((edge: Edge) => {
    editorRef.current?.updateEdge(edge);
    setSelectedEdge(edge);
  }, []);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    editorRef.current?.deleteEdge(edgeId);
    setSelectedEdge(null);
  }, []);

  const handleSelectionChange = useCallback(({ nodes, edges }: OnSelectionChangeParams) => {
    if (nodes.length === 1 && edges.length === 0) {
      setSelectedNode(nodes[0]);
      setSelectedEdge(null);
    } else if (edges.length === 1 && nodes.length === 0) {
      setSelectedEdge(edges[0]);
      setSelectedNode(null);
    } else {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, []);

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-background">
        {selectedNode && diagram ? (
          <NodeInspectorPanel 
            node={selectedNode} 
            dbType={diagram.dbType}
            onNodeUpdate={handleNodeUpdate} 
            onNodeDelete={handleNodeDelete} 
          />
        ) : selectedEdge && diagram && diagram.data.nodes ? (
          <EdgeInspectorPanel
            edge={selectedEdge}
            nodes={diagram.data.nodes}
            onEdgeUpdate={handleEdgeUpdate}
            onEdgeDelete={handleEdgeDelete}
          />
        ) : (
          <div className="p-4 h-full flex items-center justify-center">
            <p className="text-muted-foreground text-center">Select a table or a relationship to see its properties.</p>
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
              setSelectedDiagramId={setSelectedDiagramId}
              onSelectionChange={handleSelectionChange}
            />
          ) : (
            <DiagramGallery setSelectedDiagramId={setSelectedDiagramId} />
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}