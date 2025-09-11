import { tableColors } from "@/lib/colors";
import { db, type Diagram } from "@/lib/db";
import { type AppEdge, type AppNode, type TableNodeData } from "@/lib/types";
import {
  Background,
  ControlButton,
  Controls,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type ColorMode,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { IoLockClosedOutline, IoLockOpenOutline } from "react-icons/io5";
import CustomEdge from "./CustomEdge";
import { relationshipTypes } from "./EdgeInspectorPanel";
import TableNode from "./TableNode";

interface DiagramEditorProps {
  diagram: Diagram;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  setRfInstance: (instance: ReactFlowInstance<AppNode, AppEdge> | null) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

const DiagramEditor = forwardRef(
  (
    {
      diagram,
      onSelectionChange,
      setRfInstance,
      selectedNodeId,
      selectedEdgeId,
    }: DiagramEditorProps,
    ref
  ) => {
    const [allNodes, setAllNodes] = useState<AppNode[]>([]);
    const [edges, setEdges] = useState<AppEdge[]>([]);
    const [rfInstance, setRfInstanceLocal] = useState<ReactFlowInstance<
      AppNode,
      AppEdge
    > | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    const edgeTypes: EdgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
    const visibleNodes = useMemo(
      () => allNodes.filter((n) => !n.data.isDeleted),
      [allNodes]
    );
    const isLocked = diagram.data.isLocked ?? false;

    const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
      setHoveredEdgeId(edge.id);
    }, []);

    const onEdgeMouseLeave = useCallback(() => {
      setHoveredEdgeId(null);
    }, []);

    const processedEdges = useMemo(() => {
      return edges.map((edge) => {
        const isHighlighted =
          edge.source === selectedNodeId ||
          edge.target === selectedNodeId ||
          edge.id === selectedEdgeId ||
          edge.id === hoveredEdgeId;

        return {
          ...edge,
          data: {
            ...edge.data,
            isHighlighted,
          },
        };
      });
    }, [edges, selectedNodeId, selectedEdgeId, hoveredEdgeId]);

    const handleLockChange = useCallback(() => {
      if (diagram && diagram.id) {
        db.diagrams.update(diagram.id, {
          "data.isLocked": !isLocked,
          updatedAt: new Date(),
        });
      }
    }, [diagram, isLocked]);

    useEffect(() => {
      if (diagram?.data) {
        let wasModified = false;
        const initialNodes: AppNode[] = (diagram.data.nodes ?? []).map(
          (node: AppNode, index: number) => {
            if (node.data.order === undefined || node.data.order === null) {
              wasModified = true;
            }

            const newData: TableNodeData = {
              ...node.data,
              order: node.data.order ?? index,
              color:
                node.data.color ??
                tableColors[Math.floor(Math.random() * tableColors.length)]!,
            };

            // Only add deletedAt if it exists
            if (node.data.deletedAt) {
              newData.deletedAt = new Date(node.data.deletedAt);
            }

            return {
              ...node,
              data: newData,
            };
          }
        );
        const initialEdges: AppEdge[] = (diagram.data.edges ?? []).map(
          (edge) => ({ ...edge, type: "custom" })
        );

        setAllNodes(initialNodes);
        setEdges(initialEdges);

        if (wasModified && diagram.id) {
          db.diagrams.update(diagram.id, {
            data: { ...diagram.data, nodes: initialNodes, edges: initialEdges },
            updatedAt: new Date(),
          });
        }
      }
    }, [diagram]);

    useEffect(() => {
      onSelectionChange({ nodes: [], edges: [] });
    }, [diagram.id, onSelectionChange]);

    useEffect(() => {
      if (rfInstance) {
        // Use a timeout to ensure nodes have been rendered before fitting view
        setTimeout(() => {
          rfInstance.fitView({ duration: 200 });
        }, 0);
      }
    }, [diagram.id, rfInstance]);

    const saveDiagram = useCallback(async () => {
      if (diagram && rfInstance) {
        await db.diagrams.update(diagram.id!, {
          data: {
            ...diagram.data,
            nodes: allNodes,
            edges,
            viewport: rfInstance.getViewport(),
          },
          updatedAt: new Date(),
        });
      }
    }, [diagram, allNodes, edges, rfInstance]);

    useEffect(() => {
      const handler = setTimeout(() => saveDiagram(), 1000);
      return () => clearTimeout(handler);
    }, [allNodes, edges, saveDiagram]);

    const undoDelete = useCallback(() => {
      setAllNodes((currentNodes) => {
        const deletedNodes = currentNodes.filter(
          (n) => n.data.isDeleted && n.data.deletedAt
        );
        if (deletedNodes.length === 0) return currentNodes;

        const lastDeletedNode = deletedNodes.reduce((latest, current) =>
          (latest.data.deletedAt?.getTime() ?? 0) >
            (current.data.deletedAt?.getTime() ?? 0)
            ? latest
            : current
        );

        return currentNodes.map((n) => {
          if (n.id === lastDeletedNode.id) {
            const { isDeleted, deletedAt, ...restData } = n.data;
            return { ...n, data: restData };
          }
          return n;
        });
      });
    }, []);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "z") {
          event.preventDefault();
          undoDelete();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undoDelete]);

    const performSoftDelete = (
      nodeIds: string[],
      currentNodes: AppNode[]
    ): AppNode[] => {
      const now = new Date();
      let newNodes = currentNodes.map((n) => {
        if (nodeIds.includes(n.id)) {
          return { ...n, data: { ...n.data, isDeleted: true, deletedAt: now } };
        }
        return n;
      });

      const deletedNodes = newNodes
        .filter((n) => n.data.isDeleted && n.data.deletedAt)
        .sort(
          (a, b) =>
            (a.data.deletedAt?.getTime() ?? 0) -
            (b.data.deletedAt?.getTime() ?? 0)
        );
      if (deletedNodes.length > 10) {
        const oldestNode = deletedNodes[0];
        if (oldestNode) {
          newNodes = newNodes.filter((n) => n.id !== oldestNode.id);
        }
      }
      return newNodes;
    };

    const onNodesChange: OnNodesChange = useCallback(
      (changes: NodeChange[]) => {
        const removeChangeIds = changes
          .filter((c: NodeChange) => c.type === "remove" && "id" in c)
          .map((c: NodeChange) => (c as { id: string }).id);

        if (removeChangeIds.length > 0) {
          setAllNodes((currentNodes) =>
            performSoftDelete(removeChangeIds, currentNodes)
          );
        }

        const nonRemoveChanges = changes.filter(
          (c: NodeChange) => c.type !== "remove"
        );
        if (nonRemoveChanges.length > 0) {
          setAllNodes(
            (nds) => applyNodeChanges(nonRemoveChanges, nds) as AppNode[]
          );
        }
      },
      []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
      (changes: EdgeChange[]) =>
        setEdges((eds) => applyEdgeChanges(changes, eds) as AppEdge[]),
      []
    );

    const onConnect: OnConnect = useCallback((connection: Connection) => {
      const newEdge = {
        ...connection,
        type: "custom",
        data: { relationship: relationshipTypes[1]?.value ?? "one-to-many" },
      };
      setEdges((eds) => addEdge(newEdge, eds) as AppEdge[]);
    }, []);

    const deleteNode = useCallback(
      (nodeId: string) => {
        setAllNodes((currentNodes) =>
          performSoftDelete([nodeId], currentNodes)
        );
        onSelectionChange({ nodes: [], edges: [] });
      },
      [onSelectionChange]
    );

    const nodeTypes: NodeTypes = useMemo(
      () => ({
        table: (props: NodeProps) => (
          <TableNode
            {...props}
            data={props.data as TableNodeData}
            onDeleteRequest={deleteNode}
          />
        ),
      }),
      [deleteNode]
    );

    const onInit = (instance: unknown) => {
      setRfInstanceLocal(instance as ReactFlowInstance<AppNode, AppEdge>);
      setRfInstance(instance as ReactFlowInstance<AppNode, AppEdge>);
    };

    useImperativeHandle(ref, () => ({
      updateNode: (updatedNode: AppNode) => {
        setAllNodes((nds) =>
          nds.map((node) =>
            node.id === updatedNode.id
              ? { ...node, data: { ...updatedNode.data } }
              : node
          )
        );
      },
      deleteNode: deleteNode,
      updateEdge: (updatedEdge: AppEdge) => {
        setEdges((eds) =>
          eds.map((edge) => (edge.id === updatedEdge.id ? updatedEdge : edge))
        );
      },
      deleteEdge: (edgeId: string) => {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
        onSelectionChange({ nodes: [], edges: [] });
      },
      addNode: (newNode: AppNode) => {
        setAllNodes((nds) => nds.concat(newNode));
      },
      undoDelete: undoDelete,
      batchUpdateNodes: (nodesToUpdate: AppNode[]) => {
        const nodeUpdateMap = new Map(nodesToUpdate.map((n) => [n.id, n]));
        setAllNodes((currentNodes) =>
          currentNodes.map((node) => nodeUpdateMap.get(node.id) || node)
        );
      },
    }));

    return (
      <div className="w-full h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={visibleNodes}
          edges={processedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={onInit}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnDoubleClick={true}
          deleteKeyCode={isLocked ? null : ["Backspace", "Delete"]}
          fitView
          colorMode={theme as ColorMode}
        >
          <Controls showInteractive={false}>
            <ControlButton
              onClick={handleLockChange}
              title={isLocked ? "Unlock" : "Lock"}
              className="flex items-center justify-center"
            >
              {isLocked ? <IoLockClosedOutline size={18} /> : <IoLockOpenOutline size={18} />}
            </ControlButton>
          </Controls>
          <Background />
        </ReactFlow>
      </div>
    );
  }
);

export default DiagramEditor;