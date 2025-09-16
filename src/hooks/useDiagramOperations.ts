import { tableColors } from "@/lib/colors";
import { colors } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  type AppEdge,
  type AppNode,
  type AppNoteNode,
  type AppZoneNode,
  type Diagram,
} from "@/lib/types";
import { type ReactFlowInstance } from "@xyflow/react";
import { useCallback } from "react";

interface UseDiagramOperationsProps {
  diagram: Diagram | undefined;
  rfInstance: ReactFlowInstance<AppNode, AppEdge> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorRef: React.RefObject<any>;
  setSelectedDiagramId: (id: number | null) => void;
}

export function useDiagramOperations({
  diagram,
  rfInstance,
  editorRef,
  setSelectedDiagramId,
}: UseDiagramOperationsProps) {
  const handleCreateTable = (tableName: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({
        x: window.innerWidth * 0.6,
        y: window.innerHeight / 2,
      });
      position = { x: flowPosition.x - 144, y: flowPosition.y - 50 };
    }
    const visibleNodes =
      diagram?.data.nodes.filter((n: AppNode) => !n.data.isDeleted) || [];
    const newNode = {
      id: `${tableName}-${+new Date()}`,
      type: "table",
      position,
      data: {
        label: tableName,
        color:
          tableColors[Math.floor(Math.random() * tableColors.length)] ??
          colors.DEFAULT_TABLE_COLOR,
        columns: [
          {
            id: `col_${Date.now()}`,
            name: "id",
            type: "INT",
            pk: true,
            nullable: false,
          },
        ],
        order: visibleNodes.length,
      },
    };
    editorRef.current?.addNode(newNode);
  };

  const handleCreateTableAtPosition = useCallback(
    (position: { x: number; y: number }) => {
      if (!diagram) return;
      const visibleNodes =
        diagram.data.nodes.filter((n: AppNode) => !n.data.isDeleted) || [];
      const tableName = `new_table_${visibleNodes.length + 1}`;

      // Center the node on the cursor position
      const nodeWidth = 288; // As defined in TableNode.tsx
      const nodeHeight = 100; // Approximate default height
      const adjustedPosition = {
        x: position.x - nodeWidth / 2,
        y: position.y - nodeHeight / 2,
      };

      const newNode = {
        id: `${tableName}-${+new Date()}`,
        type: "table",
        position: adjustedPosition,
        data: {
          label: tableName,
          color:
            tableColors[Math.floor(Math.random() * tableColors.length)] ??
            colors.DEFAULT_TABLE_COLOR,
          columns: [
            {
              id: `col_${Date.now()}`,
              name: "id",
              type: "INT",
              pk: true,
              nullable: false,
            },
          ],
          order: visibleNodes.length,
        },
      };
      editorRef.current?.addNode(newNode);
    },
    [diagram, editorRef]
  );

  const handleCreateNote = (text: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({
        x: window.innerWidth * 0.6,
        y: window.innerHeight / 2,
      });
      position = { x: flowPosition.x - 96, y: flowPosition.y - 96 };
    }
    const newNote: AppNoteNode = {
      id: `note-${+new Date()}`,
      type: "note",
      position,
      width: 192,
      height: 192,
      data: {
        text,
      },
    };
    editorRef.current?.addNode(newNote);
  };

  const handleCreateZone = (name: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance) {
      const flowPosition = rfInstance.screenToFlowPosition({
        x: window.innerWidth * 0.6,
        y: window.innerHeight / 2,
      });
      position = { x: flowPosition.x - 150, y: flowPosition.y - 150 };
    }
    const newZone: AppZoneNode = {
      id: `zone-${+new Date()}`,
      type: "zone",
      position,
      width: 300,
      height: 300,
      zIndex: -1,
      data: {
        name,
      },
    };
    editorRef.current?.addNode(newZone);
  };

  const handleDeleteDiagram = async () => {
    if (diagram) {
      await db.diagrams.update(diagram.id!, {
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
      setSelectedDiagramId(null);
    }
  };

  return {
    handleCreateTable,
    handleCreateTableAtPosition,
    handleDeleteDiagram,
    handleCreateNote,
    handleCreateZone,
  };
}
