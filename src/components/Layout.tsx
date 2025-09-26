import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { tableColors } from "@/lib/colors";
import { colors, KeyboardShortcuts } from "@/lib/constants";
import { ElementType, type AppEdge, type AppNode, type AppNoteNode, type AppZoneNode, type ProcessedEdge, type ProcessedNode } from "@/lib/types";
import { useStore, type StoreState } from "@/store/store";
import { showError, showSuccess } from "@/utils/toast";
import { type ReactFlowInstance } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AboutDialog } from "./AboutDialog";
import { AddElementDialog } from "./AddElementDialog";
import { AddNoteDialog } from "./AddNoteDialog";
import { AddRelationshipDialog } from "./AddRelationshipDialog";
import { AddTableDialog } from "./AddTableDialog";
import { AddZoneDialog } from "./AddZoneDialog";
import DiagramEditor from "./DiagramEditor";
import DiagramGallery from "./DiagramGallery";
import { DiagramLayout } from "./DiagramLayout";
import EditorSidebar from "./EditorSidebar";
import { ExportDialog } from "./ExportDialog";
import { PWAUpdateNotification } from "./PWAUpdateNotification";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { UpdateDialog } from "./UpdateDialog";

interface LayoutProps {
  onInstallAppRequest: () => void;
}

export default function Layout({ onInstallAppRequest }: LayoutProps) {
  const selectedDiagramId = useStore((state) => state.selectedDiagramId);
  const isRelationshipDialogOpen = useStore((state) => state.isRelationshipDialogOpen);
  const allDiagrams = useStore((state) => state.diagrams);
  const isLoading = useStore((state) => state.isLoading);
  const isMobile = useIsMobile();

  const diagram = useMemo(() =>
    allDiagrams.find((d) => d.id === selectedDiagramId),
    [allDiagrams, selectedDiagramId]
  );

  const existingTableNames = useMemo(() =>
    diagram?.data.nodes.map(n => n.data.label) ?? [],
    [diagram]
  );

  const existingZoneNames = useMemo(() =>
    (diagram?.data?.zones || []).map(z => z.data.name) ?? [],
    [diagram]
  )

  const { addNode, undoDelete, copyNodes, pasteNodes, lastCursorPosition, addEdge, setIsAddRelationshipDialogOpen } = useStore(
    useShallow((state: StoreState) => ({
      addNode: state.addNode,
      undoDelete: state.undoDelete,
      copyNodes: state.copyNodes,
      pasteNodes: state.pasteNodes,
      lastCursorPosition: state.lastCursorPosition,
      addEdge: state.addEdge,
      setIsAddRelationshipDialogOpen: state.setIsRelationshipDialogOpen,
    }))
  );

  const {
    // sidebarState,
    setSidebarState,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    handleOpenSidebar,
    sidebarPanelRef,
  } = useSidebarState();

  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
  const [isAddZoneDialogOpen, setIsAddZoneDialogOpen] = useState(false);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isAddElementDialogOpen, setIsAddElementDialogOpen] = useState(false);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<ProcessedNode, ProcessedEdge> | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedDiagramId) {
        const target = event.target as HTMLElement;
        if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) {
          return;
        }
        // handle Ctrl+A to open table add dialog
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.ADD_NEW_TABLE) {
          event.preventDefault();
          if (!isAddTableDialogOpen) {
            setIsAddTableDialogOpen(true);
          }
        }
        // Handle Ctrl+B to toggle sidebar
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.SIDEBAR_TOGGLE) {
          event.preventDefault();
          if (isMobile) {
            // For mobile (sheet), toggle isSidebarOpen
            setIsSidebarOpen(!isSidebarOpen);
          } else {
            // For desktop (resizable panel), toggle via handleOpenSidebar
            handleOpenSidebar();
          }
        }
        //handle Ctrl+Z to undo table delete
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.UNDO_TABLE_DELETE) {
          event.preventDefault();
          undoDelete();
        }
        // Handle Ctrl+C to copy selected nodes
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.COPY_SELECTION) {
          event.preventDefault();
          if (!rfInstance) return;
          const selectedNodes = rfInstance.getNodes().filter(
            (n) => n.selected && (n.type === 'table' || n.type === 'note')
          ) as (AppNode | AppNoteNode)[];

          if (selectedNodes.length > 0) {
            copyNodes(selectedNodes);
            showSuccess(`${selectedNodes.length} item(s) copied to clipboard.`);
          }
        }
        // Handle Ctrl+V to paste nodes
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.PASTE_COPIED) {
          event.preventDefault();
          if (!rfInstance) return;

          // Use stored cursor position if available, otherwise use center of viewport
          let position;
          if (lastCursorPosition) {
            position = rfInstance.screenToFlowPosition(lastCursorPosition);
          } else {
            // Fallback to center of viewport
            const { x, y, zoom } = rfInstance.getViewport();
            position = {
              x: (window.innerWidth / 2 - x) / zoom,
              y: (window.innerHeight / 2 - y) / zoom
            };
          }

          pasteNodes(position);
        }
        // Handle Ctrl+Plus to zoom in
        if ((event.ctrlKey || event.metaKey) && (event.key === KeyboardShortcuts.ZOOM_IN_KEY_1 || event.key === KeyboardShortcuts.ZOOM_IN_KEY_2)) {
          event.preventDefault();
          if (rfInstance) {
            rfInstance.zoomIn({ duration: 200 });
          }
        }
        // Handle Ctrl+Minus to zoom out
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.ZOOM_OUT_KEY) {
          event.preventDefault();
          if (rfInstance) {
            rfInstance.zoomOut({ duration: 200 });
          }
        }
        // Handle Ctrl+0 to fit view
        if ((event.ctrlKey || event.metaKey) && event.key === KeyboardShortcuts.ZOOM_RESET_KEY) {
          event.preventDefault();
          if (rfInstance) {
            rfInstance.fitView({ duration: 200 });
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedDiagramId,
    isAddTableDialogOpen,
    handleOpenSidebar,
    undoDelete,
    isMobile,
    setIsSidebarOpen,
    isSidebarOpen,
    sidebarPanelRef,
    rfInstance,
    copyNodes,
    pasteNodes,
    lastCursorPosition
  ]);

  const handleSelectElementToAdd = (type: ElementType) => {
    setIsAddElementDialogOpen(false);
    if (type === 'table') {
      setIsAddTableDialogOpen(true);
    } else if (type === 'note') {
      setIsAddNoteDialogOpen(true);
    } else if (type === 'zone') {
      setIsAddZoneDialogOpen(true);
    } else if (type === 'relationship') {
      setIsAddRelationshipDialogOpen(true);
    }
  };

  const handleCreateTable = (tableName: string) => {
    if (!diagram) return;
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({ x: window.innerWidth * 0.6, y: window.innerHeight / 2 });
      position = { x: flowPosition.x - 144, y: flowPosition.y - 50 };
    }
    const visibleNodes = diagram.data.nodes.filter((n: AppNode) => !n.data.isDeleted) || [];
    const newNode: AppNode = {
      id: `${tableName}-${+new Date()}`,
      type: "table",
      position,
      data: {
        label: tableName,
        color: tableColors[Math.floor(Math.random() * tableColors.length)] ?? colors.DEFAULT_TABLE_COLOR,
        columns: [{ id: `col_${Date.now()}`, name: "id", type: "INT", pk: true, nullable: false }],
        order: visibleNodes.length,
      },
    };
    addNode(newNode);
  };

  const handleCreateNote = (text: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({ x: window.innerWidth * 0.6, y: window.innerHeight / 2 });
      position = { x: flowPosition.x - 96, y: flowPosition.y - 96 };
    }
    const newNote: AppNoteNode = {
      id: `note-${+new Date()}`,
      type: "note",
      position,
      width: 192,
      height: 192,
      data: { text },
    };
    addNode(newNote);
  };

  const handleCreateZone = (name: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({ x: window.innerWidth * 0.6, y: window.innerHeight / 2 });
      position = { x: flowPosition.x - 150, y: flowPosition.y - 150 };
    }
    const newZone: AppZoneNode = {
      id: `zone-${+new Date()}`,
      type: "zone",
      position,
      width: 300,
      height: 300,
      zIndex: -1,
      data: { name },
    };
    addNode(newZone);
  };

  const handleCreateRelationship = (values: {
    sourceNodeId: string;
    sourceColumnId: string;
    targetNodeId: string;
    targetColumnId: string;
    relationshipType: string;
  }) => {
    if (!diagram) return;
    const { sourceNodeId, sourceColumnId, targetNodeId, targetColumnId, relationshipType } = values;

    const sourceNode = diagram.data.nodes.find(n => n.id === sourceNodeId);
    const targetNode = diagram.data.nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      showError("Source or target table not found.");
      return;
    }

    const sourceColumn = sourceNode.data.columns.find(c => c.id === sourceColumnId);
    const targetColumn = targetNode.data.columns.find(c => c.id === targetColumnId);

    if (!sourceColumn || !targetColumn) {
      showError("Source or target column not found.");
      return;
    }

    if (sourceColumn.type !== targetColumn.type) {
      showError("Cannot create relationship: Column types do not match.");
      return;
    }

    const sourceHandle = `${sourceColumnId}-right-source`;
    const targetHandle = `${targetColumnId}-left-target`;

    const newEdge: AppEdge = {
      id: `${sourceNodeId}-${targetNodeId}-${sourceHandle}-${targetHandle}`,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle,
      targetHandle,
      type: "custom",
      data: { relationship: relationshipType },
    };

    addEdge(newEdge);
  };

  if (isLoading) {
    return null; // Or a loading spinner
  }

  const sidebarContent = diagram ? (
    <EditorSidebar
      onAddElement={() => { setIsAddElementDialogOpen(true); setIsSidebarOpen(false); }}
      onAddTable={() => { setIsAddTableDialogOpen(true); setIsSidebarOpen(false); }}
      onAddNote={() => { setIsAddNoteDialogOpen(true); setIsSidebarOpen(false); }}
      onAddZone={() => { setIsAddZoneDialogOpen(true); setIsSidebarOpen(false); }}
      onSetSidebarState={setSidebarState}
      onExport={() => setIsExportDialogOpen(true)}
      onCheckForUpdate={() => setIsUpdateDialogOpen(true)}
      onInstallAppRequest={onInstallAppRequest}
      onViewShortcuts={() => setIsShortcutsDialogOpen(true)}
      onViewAbout={() => setIsAboutDialogOpen(true)}
    />
  ) : null;

  return (
    <>
      <PWAUpdateNotification onUpdateNow={() => setIsUpdateDialogOpen(true)} />
      {selectedDiagramId && diagram ? (
        <DiagramLayout
          sidebarContent={sidebarContent}
          diagramContent={<DiagramEditor setRfInstance={setRfInstance} />}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleOpenSidebar={handleOpenSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          sidebarPanelRef={sidebarPanelRef}
          onCollapse={() => setIsSidebarCollapsed(true)}
          onExpand={() => setIsSidebarCollapsed(false)}
        />
      ) : (
        <div className="w-full h-screen">
          <DiagramGallery
            onInstallAppRequest={onInstallAppRequest}
            onCheckForUpdate={() => setIsUpdateDialogOpen(true)}
            onViewAbout={() => setIsAboutDialogOpen(true)}
          />
        </div>
      )}
      <AddElementDialog
        isOpen={isAddElementDialogOpen}
        onOpenChange={setIsAddElementDialogOpen}
        onSelect={handleSelectElementToAdd}
        tableCount={diagram?.data.nodes.filter(n => !n.data.isDeleted).length || 0}
      />
      <AddTableDialog isOpen={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen} onCreateTable={handleCreateTable} existingTableNames={existingTableNames} />
      <AddNoteDialog isOpen={isAddNoteDialogOpen} onOpenChange={setIsAddNoteDialogOpen} onCreateNote={handleCreateNote} />
      <AddZoneDialog isOpen={isAddZoneDialogOpen} onOpenChange={setIsAddZoneDialogOpen} onCreateZone={handleCreateZone} existingZoneNames={existingZoneNames} />
      <AddRelationshipDialog
        isOpen={isRelationshipDialogOpen}
        onOpenChange={setIsAddRelationshipDialogOpen}
        nodes={diagram?.data.nodes.filter(n => !n.data.isDeleted) || []}
        onCreateRelationship={handleCreateRelationship}
      />
      <ExportDialog isOpen={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} diagram={diagram} rfInstance={rfInstance} />
      <UpdateDialog isOpen={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen} />
      <ShortcutsDialog isOpen={isShortcutsDialogOpen} onOpenChange={setIsShortcutsDialogOpen} />
      <AboutDialog isOpen={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen} />
    </>
  );
}