import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DiagramEditor from "./DiagramEditor";
import InspectorPanel from "./InspectorPanel";
import { useState, useRef } from "react";
import { Node } from "reactflow";
import DiagramSelector from "./DiagramSelector";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function Layout() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const editorRef = useRef<{ updateNode: (node: Node) => void; deleteNode: (nodeId: string) => void }>(null);

  const diagram = useLiveQuery(() => 
    selectedDiagramId ? db.diagrams.get(selectedDiagramId) : undefined,
    [selectedDiagramId]
  );

  const handleNodeUpdate = (node: Node) => {
    editorRef.current?.updateNode(node);
  };

  const handleNodeDelete = (nodeId: string) => {
    editorRef.current?.deleteNode(nodeId);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-background">
        {selectedNode && diagram && (
          <InspectorPanel 
            node={selectedNode} 
            dbType={diagram.dbType}
            onNodeUpdate={handleNodeUpdate} 
            onNodeDelete={handleNodeDelete} 
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
              onNodeSelect={setSelectedNode}
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