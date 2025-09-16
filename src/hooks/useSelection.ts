import { type OnSelectionChangeParams } from "@xyflow/react";
import { useCallback, useState } from "react";

export function useSelection() {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const handleSelectionChange = useCallback(
    ({ nodes, edges }: OnSelectionChangeParams) => {
      if (nodes.length === 1 && edges.length === 0 && nodes[0]) {
        setActiveItemId(nodes[0].id);
        setSelectedNodeId(nodes[0].id);
        setSelectedEdgeId(null);
      } else if (edges.length === 1 && nodes.length === 0 && edges[0]) {
        setActiveItemId(edges[0].id);
        setSelectedNodeId(null);
        setSelectedEdgeId(edges[0].id);
      } else {
        setActiveItemId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    []
  );

  return {
    activeItemId,
    setActiveItemId,
    selectedNodeId,
    setSelectedNodeId,
    selectedEdgeId,
    setSelectedEdgeId,
    handleSelectionChange,
  };
}
