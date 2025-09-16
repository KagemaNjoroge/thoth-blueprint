import { LayoutProvider } from "@/contexts/LayoutContextProvider";
import { useDiagramOperations } from "@/hooks/useDiagramOperations";
import { useDiagramSelection } from "@/hooks/useDiagramSelection";
import { useDialogs } from "@/hooks/useDialogs";
import { useEditor } from "@/hooks/useEditor";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSelection } from "@/hooks/useSelection";
import { useSidebarState } from "@/hooks/useSidebarState";
import { db } from "@/lib/db";
import { type AppEdge, type AppNode, type AppNoteNode, type AppZoneNode } from "@/lib/types";
import { type ReactFlowInstance } from "@xyflow/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useRef, useState } from "react";
import { AddNoteDialog } from "./AddNoteDialog";
import { AddTableDialog } from "./AddTableDialog";
import { AddZoneDialog } from "./AddZoneDialog";
import DiagramEditor from "./DiagramEditor";
import DiagramGallery from "./DiagramGallery";
import { DiagramLayout } from "./DiagramLayout";
import EditorSidebar from "./EditorSidebar";
import { ExportDialog } from "./ExportDialog";
import { PWAUpdateNotification } from "./PWAUpdateNotification";
import { UpdateDialog } from "./UpdateDialog";

interface LayoutProps {
  onInstallAppRequest: () => void;
}

export default function Layout({ onInstallAppRequest }: LayoutProps) {
  const { selectedDiagramId, setSelectedDiagramId } = useDiagramSelection();
  const {
    sidebarState,
    setSidebarState,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    handleOpenSidebar,
    sidebarPanelRef,
  } = useSidebarState();
  const {
    isAddTableDialogOpen,
    setIsAddTableDialogOpen,
    isExportDialogOpen,
    setIsExportDialogOpen,
    isUpdateDialogOpen,
    setIsUpdateDialogOpen,
    isAddNoteDialogOpen,
    setIsAddNoteDialogOpen,
    isAddZoneDialogOpen,
    setIsAddZoneDialogOpen,
  } = useDialogs();
  const {
    activeItemId,
    setActiveItemId,
    selectedNodeId,
    setSelectedNodeId,
    selectedEdgeId,
    setSelectedEdgeId,
    handleSelectionChange,
  } = useSelection();

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<
    AppNode,
    AppEdge
  > | null>(null);

  const editorRef = useRef<{
    updateNode: (node: AppNode) => void;
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: AppEdge) => void;
    deleteEdge: (edgeId: string) => void;
    addNode: (node: AppNode | AppNoteNode | AppZoneNode) => void;
    undoDelete: () => void;
    batchUpdateNodes: (nodes: AppNode[]) => void;
  }>(null);

  const diagram = useLiveQuery(
    () => (selectedDiagramId ? db.diagrams.get(selectedDiagramId) : undefined),
    [selectedDiagramId]
  );

  const handleAddTable = () => setIsAddTableDialogOpen(true);
  const handleAddNote = () => setIsAddNoteDialogOpen(true);
  const handleAddZone = () => setIsAddZoneDialogOpen(true);

  const {
    handleNodeUpdate,
    handleNodeDelete,
    handleEdgeUpdate,
    handleEdgeDelete,
    handleUndoDelete,
    handleBatchNodeUpdate,
  } = useEditor({ editorRef, setActiveItemId });

  const {
    handleCreateTable,
    handleCreateTableAtPosition,
    handleDeleteDiagram,
    handleCreateNote,
    handleCreateZone,
  } = useDiagramOperations({
    diagram,
    rfInstance,
    editorRef,
    setSelectedDiagramId,
  });

  const handleSetRfInstance = useCallback(
    (instance: ReactFlowInstance<AppNode, AppEdge> | null) => {
      setRfInstance(instance);
    },
    []
  );

  const isLocked = diagram?.data?.isLocked ?? false;

  useKeyboardShortcuts(selectedDiagramId, isAddTableDialogOpen, handleAddTable);

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
      onAddNote={() => {
        handleAddNote();
        setIsSidebarOpen(false);
      }}
      onAddZone={() => {
        handleAddZone();
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
      onInstallAppRequest={onInstallAppRequest}
    />
  ) : null;

  return (
    <LayoutProvider
      selectedDiagramId={selectedDiagramId}
      setSelectedDiagramId={setSelectedDiagramId}
      diagram={diagram}
      isLocked={isLocked}
      rfInstance={rfInstance}
      setRfInstance={setRfInstance}
      sidebarState={sidebarState}
      setSidebarState={setSidebarState}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      isAddTableDialogOpen={isAddTableDialogOpen}
      setIsAddTableDialogOpen={setIsAddTableDialogOpen}
      isExportDialogOpen={isExportDialogOpen}
      setIsExportDialogOpen={setIsExportDialogOpen}
      isUpdateDialogOpen={isUpdateDialogOpen}
      setIsUpdateDialogOpen={setIsUpdateDialogOpen}
      handleNodeUpdate={handleNodeUpdate}
      handleNodeDelete={handleNodeDelete}
      handleEdgeUpdate={handleEdgeUpdate}
      handleEdgeDelete={handleEdgeDelete}
      handleAddTable={handleAddTable}
      handleCreateTable={handleCreateTable}
      handleCreateTableAtPosition={handleCreateTableAtPosition}
      handleDeleteDiagram={handleDeleteDiagram}
      handleUndoDelete={handleUndoDelete}
      handleBatchNodeUpdate={handleBatchNodeUpdate}
      handleOpenSidebar={handleOpenSidebar}
      handleSetRfInstance={handleSetRfInstance}
      activeItemId={activeItemId}
      setActiveItemId={setActiveItemId}
      selectedNodeId={selectedNodeId}
      setSelectedNodeId={setSelectedNodeId}
      selectedEdgeId={selectedEdgeId}
      setSelectedEdgeId={setSelectedEdgeId}
    >
      <PWAUpdateNotification onUpdateNow={() => setIsUpdateDialogOpen(true)} />
      {selectedDiagramId && diagram ? (
        <DiagramLayout
          sidebarContent={sidebarContent}
          diagramContent={
            <DiagramEditor
              ref={editorRef}
              diagram={diagram}
              onSelectionChange={handleSelectionChange}
              setRfInstance={handleSetRfInstance}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onCreateTableAtPosition={handleCreateTableAtPosition}
            />
          }
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleOpenSidebar={handleOpenSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          diagram={diagram}
          sidebarPanelRef={sidebarPanelRef}
          onCollapse={() => setIsSidebarCollapsed(true)}
          onExpand={() => setIsSidebarCollapsed(false)}
        />
      ) : (
        <div className="w-full h-screen">
          <DiagramGallery
            setSelectedDiagramId={setSelectedDiagramId}
            onInstallAppRequest={onInstallAppRequest}
            onCheckForUpdate={() => setIsUpdateDialogOpen(true)}
          />
        </div>
      )}
      <AddTableDialog
        isOpen={isAddTableDialogOpen}
        onOpenChange={setIsAddTableDialogOpen}
        onCreateTable={handleCreateTable}
      />
      <AddNoteDialog
        isOpen={isAddNoteDialogOpen}
        onOpenChange={setIsAddNoteDialogOpen}
        onCreateNote={handleCreateNote}
      />
      <AddZoneDialog
        isOpen={isAddZoneDialogOpen}
        onOpenChange={setIsAddZoneDialogOpen}
        onCreateZone={handleCreateZone}
      />
      <ExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        diagram={diagram}
        rfInstance={rfInstance}
      />
      <UpdateDialog
        isOpen={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
      />
    </LayoutProvider>
  );
}