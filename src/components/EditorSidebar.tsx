import { cn } from "@/lib/utils";
import { useStore } from "@/store/store";
import { GitCommitHorizontal, Plus, Table } from "lucide-react";
import React, { useMemo, useState } from "react";
import EditorMenubar from "./EditorMenubar";
import RelationshipsTab from "./RelationshipsTab";
import TablesTab from "./TablesTab";
import { Button } from "./ui/button";

interface EditorSidebarProps {
  onAddElement: () => void;
  onAddTable: () => void;
  onAddNote: () => void;
  onAddZone: () => void;
  onSetSidebarState: (state: "docked" | "hidden") => void;
  onExport: () => void;
  onCheckForUpdate: () => void;
  onInstallAppRequest: () => void;
  onViewShortcuts: () => void;
  onViewAbout: () => void;
}

export default function EditorSidebar({
  onAddElement,
  onAddTable,
  onAddNote,
  onAddZone,
  onSetSidebarState,
  onExport,
  onCheckForUpdate,
  onInstallAppRequest,
  onViewShortcuts,
  onViewAbout,
}: EditorSidebarProps) {
  const selectedDiagramId = useStore((state) => state.selectedDiagramId);
  const allDiagrams = useStore((state) => state.diagrams);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const selectedEdgeId = useStore((state) => state.selectedEdgeId);

  const diagram = useMemo(() =>
    allDiagrams.find((d) => d.id === selectedDiagramId),
    [allDiagrams, selectedDiagramId]
  );

  const [currentTab, setCurrentTab] = useState<string>(() => {
    // Set initial tab based on what's selected
    if (selectedEdgeId) return "relationships";
    if (selectedNodeId) return "tables";
    return "tables";
  });

  const nodes = useMemo(
    () =>
      (diagram?.data.nodes ?? [])
        .filter((n) => !n.data.isDeleted)
        .sort(
          (a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity)
        ),
    [diagram?.data.nodes]
  );

  const edges = useMemo(() => diagram?.data.edges ?? [], [diagram?.data.edges]);
  const isLocked = useMemo(() => diagram?.data.isLocked ?? false, [diagram?.data.isLocked]);

  // Auto-switch tabs based on selection
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
  };

  // Switch to appropriate tab when items are selected
  React.useEffect(() => {
    if (selectedEdgeId && edges.some((e) => e.id === selectedEdgeId)) {
      setCurrentTab("relationships");
    } else if (selectedNodeId && nodes.some((n) => n.id === selectedNodeId)) {
      setCurrentTab("tables");
    }
  }, [selectedNodeId, selectedEdgeId, nodes, edges]);

  if (!diagram) return null;

  return (
    <div className="h-full w-full flex flex-col bg-card" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <div className="flex items-center border-b pl-2 flex-shrink-0">
        <img
          src="/ThothBlueprint-icon.svg"
          alt="ThothBlueprint Logo"
          className="h-5 w-5 mr-2 flex-shrink-0"
        />
        <EditorMenubar
          onAddTable={onAddTable}
          onAddNote={onAddNote}
          onAddZone={onAddZone}
          onSetSidebarState={onSetSidebarState}
          onExport={onExport}
          onCheckForUpdate={onCheckForUpdate}
          onInstallAppRequest={onInstallAppRequest}
          onViewShortcuts={onViewShortcuts}
          onViewAbout={onViewAbout}
        />
      </div>

      {/* Diagram Info */}
      <div className="p-2 flex-shrink-0 border-b">
        <h3 className="text-lg font-semibold tracking-tight px-2">
          {diagram.name}
        </h3>
        <p className="text-sm text-muted-foreground px-2">{diagram.dbType}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 px-4 my-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground flex-grow grid-cols-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTabChange("tables")}
              className={cn(
                "relative h-8 rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                currentTab === "tables"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-muted-foreground/10"
              )}
            >
              <Table className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline">Tables</span>
              <span className="lg:hidden">Tbls</span>
              <span>&nbsp;({nodes.length})</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTabChange("relationships")}
              className={cn(
                "relative h-8 rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                currentTab === "relationships"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-muted-foreground/10"
              )}
            >
              <GitCommitHorizontal className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline">Relations</span>
              <span className="lg:hidden">Rels</span>
              <span>&nbsp;({edges.length})</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onAddElement}
            disabled={isLocked}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add Element</span>
          </Button>
        </div>
      </div>

      {/* Tab Content - Only render active tab */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentTab === "tables" && (
          <TablesTab
            nodes={nodes}
            isLocked={isLocked}
          />
        )}
        {currentTab === "relationships" && (
          <RelationshipsTab
            nodes={nodes}
            edges={edges}
          />
        )}
      </div>
    </div>
  );
}