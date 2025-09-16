import { type AppEdge, type AppNode } from "@/lib/types";
import { useCallback } from "react";

interface UseEditorProps {
  editorRef: React.RefObject<{
    updateNode: (node: AppNode) => void;
    deleteNode: (nodeId: string) => void;
    updateEdge: (edge: AppEdge) => void;
    deleteEdge: (edgeId: string) => void;
    addNode: (node: AppNode) => void;
    undoDelete: () => void;
    batchUpdateNodes: (nodes: AppNode[]) => void;
  }>;
  setActiveItemId: (id: string | null) => void;
}

export function useEditor({ editorRef, setActiveItemId }: UseEditorProps) {
  const handleNodeUpdate = useCallback(
    (node: AppNode) => {
      editorRef.current?.updateNode(node);
    },
    [editorRef]
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      editorRef.current?.deleteNode(nodeId);
      setActiveItemId(null);
    },
    [editorRef, setActiveItemId]
  );

  const handleEdgeUpdate = useCallback(
    (edge: AppEdge) => {
      editorRef.current?.updateEdge(edge);
    },
    [editorRef]
  );

  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      editorRef.current?.deleteEdge(edgeId);
      setActiveItemId(null);
    },
    [editorRef, setActiveItemId]
  );

  const handleUndoDelete = useCallback(() => {
    editorRef.current?.undoDelete();
  }, [editorRef]);

  const handleBatchNodeUpdate = useCallback(
    (nodesToUpdate: AppNode[]) => {
      editorRef.current?.batchUpdateNodes(nodesToUpdate);
    },
    [editorRef]
  );

  return {
    handleNodeUpdate,
    handleNodeDelete,
    handleEdgeUpdate,
    handleEdgeDelete,
    handleUndoDelete,
    handleBatchNodeUpdate,
  };
}
