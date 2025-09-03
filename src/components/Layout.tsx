import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DiagramEditor from "./DiagramEditor";
import NodeInspectorPanel from "./NodeInspectorPanel";
import EdgeInspectorPanel from "./EdgeInspectorPanel";
import { useState, useRef } from "react";
import { Node, Edge, OnSelectionChangeParams } from "reactflow";
import DiagramSelector from "./DiagramSelector";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

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

  const handleNodeUpdate = (node: Node) => {
    editorRef.current?.updateNode(node);
  };

  const handleNodeDelete = (nodeId: string) => {
    editorRef.current?.deleteNode(nodeId);
    setSelectedNode(null);
  };

  const handleEdgeUpdate = (edge: Edge) => {
    editorRef.current?.updateEdge(edge);
  };

  const handleEdgeDelete = (edgeId: string) => {
    editorRef.current?.deleteEdge(edgeId);
    setSelectedEdge(null);
  };

  const handleSelectionChange = ({ nodes, edges }: OnSelectionChangeParams) => {
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
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-background">
        {selectedNode && diagram && (
          <NodeInspectorPanel 
            node={selectedNode} 
            dbType={diagram.dbType}
            onNodeUpdate={handleNodeUpdate} 
            onNodeDelete={handleNodeDelete} 
          />
        )}
        {selectedEdge && diagram && diagram.data.nodes && (
          <EdgeInspectorPanel
            edge={selectedEdge}
            nodes={diagram.data.nodes}
            onEdgeUpdate={handleEdgeUpdate}
            onEdgeDelete={handleEdgeDelete}
          />
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
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">Database Designer</h2>
              <p className="text-muted-foreground">Select a diagram or create a new one to start.</p>
              <div className="flex justify-center">
                <DiagramSelector selectedDiagramId={null} setSelectedDiagramId={setSelectedDiagramId} />
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}