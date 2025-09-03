import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DiagramEditor from "./DiagramEditor";
import InspectorPanel from "./InspectorPanel";
import { useState, useRef } from "react";
import { Node } from "reactflow";
import DiagramSelector from "./DiagramSelector";

export default function Layout() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const editorRef = useRef<{ updateNode: (node: Node) => void; deleteNode: (nodeId: string) => void }>(null);

  const handleNodeUpdate = (node: Node) => {
    editorRef.current?.updateNode(node);
  };

  const handleNodeDelete = (nodeId: string) => {
    editorRef.current?.deleteNode(nodeId);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-background">
        {selectedNode && (
          <InspectorPanel 
            node={selectedNode} 
            onNodeUpdate={handleNodeUpdate} 
            onNodeDelete={handleNodeDelete} 
          />
        )}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}>
        <div className="flex h-full items-center justify-center relative">
          {selectedDiagramId ? (
            <DiagramEditor 
              ref={editorRef}
              diagramId={selectedDiagramId} 
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