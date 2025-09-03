import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DiagramList from "./DiagramList";
import DiagramEditor from "./DiagramEditor";
import { useState } from "react";

export default function Layout() {
  const [selectedDiagramId, setSelectedDiagramId] = useState<number | null>(null);

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen w-full rounded-lg border">
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
        <DiagramList selectedDiagramId={selectedDiagramId} setSelectedDiagramId={setSelectedDiagramId} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={80}>
        <div className="flex h-full items-center justify-center relative">
          {selectedDiagramId ? (
            <DiagramEditor diagramId={selectedDiagramId} setSelectedDiagramId={setSelectedDiagramId} />
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Database Designer</h2>
              <p className="text-muted-foreground">Select a diagram or create a new one to start.</p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}