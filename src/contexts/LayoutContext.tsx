import { type AppEdge, type AppNode, type Diagram } from "@/lib/types";
import { type ReactFlowInstance } from "@xyflow/react";
import { createContext } from "react";

interface LayoutContextType {
  selectedDiagramId: number | null;
  setSelectedDiagramId: (id: number | null) => void;
  activeItemId: string | null;
  setActiveItemId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  diagram: Diagram | undefined;
  isLocked: boolean;
  rfInstance: ReactFlowInstance<AppNode, AppEdge> | null;
  setRfInstance: (instance: ReactFlowInstance<AppNode, AppEdge> | null) => void;
  sidebarState: "docked" | "hidden";
  setSidebarState: (state: "docked" | "hidden") => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isAddTableDialogOpen: boolean;
  setIsAddTableDialogOpen: (open: boolean) => void;
  isExportDialogOpen: boolean;
  setIsExportDialogOpen: (open: boolean) => void;
  isUpdateDialogOpen: boolean;
  setIsUpdateDialogOpen: (open: boolean) => void;
  handleNodeUpdate: (node: AppNode) => void;
  handleNodeDelete: (nodeId: string) => void;
  handleEdgeUpdate: (edge: AppEdge) => void;
  handleEdgeDelete: (edgeId: string) => void;
  handleAddTable: () => void;
  handleCreateTable: (tableName: string) => void;
  handleCreateTableAtPosition: (position: { x: number; y: number }) => void;
  handleDeleteDiagram: () => void;
  handleUndoDelete: () => void;
  handleBatchNodeUpdate: (nodesToUpdate: AppNode[]) => void;
  handleOpenSidebar: () => void;
  handleSetRfInstance: (instance: ReactFlowInstance<AppNode, AppEdge> | null) => void;
  editorRef: React.RefObject<{
    updateNode: (node: AppNode) => void;
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: AppEdge) => void;
    deleteEdge: (edgeId: string) => void;
    addNode: (node: AppNode) => void;
    undoDelete: () => void;
    batchUpdateNodes: (nodes: AppNode[]) => void;
  }>;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
