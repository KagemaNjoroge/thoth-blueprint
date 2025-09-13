import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { tableColors } from "@/lib/colors";
import { db, type Diagram } from "@/lib/db";
import { type AppEdge, type AppNode, type AppNoteNode, type NoteNodeData, type TableNodeData } from "@/lib/types";
import {
  Background,
  ControlButton,
  Controls,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type ColorMode,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeParams,
  type ReactFlowInstance
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, StickyNote } from "lucide-react";
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
import NoteNode from "./NoteNode";
import TableNode from "./TableNode";

interface DiagramEditorProps {
  diagram: Diagram;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  setRfInstance: (instance: ReactFlowInstance<AppNode, AppEdge> | null) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onCreateTableAtPosition: (position: { x: number; y: number }) => void;
}

const DiagramEditor = forwardRef(
  (
    {
      diagram,
      onSelectionChange,
      setRfInstance,
      selectedNodeId,
      selectedEdgeId,
      onCreateTableAtPosition,
    }: DiagramEditorProps,
    ref
  ) => {
    const [allNodes, setAllNodes] = useState<AppNode[]>([]);
    const [notes, setNotes] = useState<AppNoteNode[]>([]);
    const [edges, setEdges] = useState<AppEdge[]>([]);
    const [rfInstance, setRfInstanceLocal] = useState<ReactFlowInstance<
      AppNode,
      AppEdge
    > | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const clickPositionRef = useRef<{ x: number; y: number } | null>(null);

    const edgeTypes: EdgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

    const visibleNodes = useMemo(
      () => allNodes.filter((n) => !n.data.isDeleted),
      [allNodes]
    );

    const isLocked = useMemo(() => diagram.data.isLocked ?? false, [diagram.data.isLocked]);

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

        if (edge.data?.isHighlighted === isHighlighted) {
          return edge;
        }

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
      if (!diagram?.id) return;

      db.diagrams.update(diagram.id, {
        "data.isLocked": !isLocked,
        updatedAt: new Date(),
      }).catch(error => {
        console.error("Failed to update lock status:", error);
      });
    }, [diagram?.id, isLocked]);

    useEffect(() => {
      if (!diagram?.data) return;

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

      const initialNotes: AppNoteNode[] = (diagram.data.notes ?? []).map(
        (note) => ({ ...note, type: "note" })
      );

      setAllNodes(initialNodes);
      setEdges(initialEdges);
      setNotes(initialNotes);

      if (wasModified && diagram.id) {
        db.diagrams.update(diagram.id, {
          data: { ...diagram.data, nodes: initialNodes, edges: initialEdges, notes: initialNotes },
          updatedAt: new Date(),
        }).catch(error => {
          console.error("Failed to update diagram:", error);
        });
      }
    }, [diagram]);

    // Reset selection when diagram changes
    useEffect(() => {
      onSelectionChange({ nodes: [], edges: [] });
    }, [diagram.id, onSelectionChange]);

    // Fit view when diagram or instance changes
    useEffect(() => {
      if (rfInstance) {
        // Use a timeout to ensure nodes have been rendered before fitting view
        const timer = setTimeout(() => {
          rfInstance.fitView({ duration: 200 }).catch(error => {
            console.error("Failed to fit view:", error);
          });
        }, 0);

        return () => clearTimeout(timer);
      }
      return undefined;
    }, [diagram.id, rfInstance]);

    const saveDiagram = useCallback(async () => {
      if (!diagram?.id || !rfInstance) return;

      try {
        await db.diagrams.update(diagram.id, {
          data: {
            ...diagram.data,
            nodes: allNodes,
            edges,
            notes,
            viewport: rfInstance.getViewport(),
          },
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Failed to save diagram:", error);
      }
    }, [diagram, allNodes, edges, notes, rfInstance]);

    // Debounced saving
    useEffect(() => {
      const handler = setTimeout(() => saveDiagram(), 1000);
      return () => clearTimeout(handler);
    }, [allNodes, edges, notes, saveDiagram]);

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

    // Keyboard shortcut handling
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

    const performSoftDelete = useCallback((
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

      // Limit deleted nodes to 10 to prevent memory issues
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
    }, []);

    const deleteNote = useCallback((nodeIds: string[]) => {
      setNotes(nds => nds.filter(n => !nodeIds.includes(n.id)));
    }, []);

    // Node change handling
    const onNodesChange: OnNodesChange = useCallback(
      (changes: NodeChange[]) => {
        const tableNodeChanges: NodeChange[] = [];
        const noteChanges: NodeChange[] = [];
        const noteIdSet = new Set(notes.map(n => n.id));

        for (const change of changes) {
          if ('id' in change && noteIdSet.has(change.id)) {
            noteChanges.push(change);
          } else {
            tableNodeChanges.push(change);
          }
        }

        // Handle table node changes (soft delete)
        const tableRemoveChangeIds = tableNodeChanges
          .filter((c) => c.type === "remove" && "id" in c)
          .map((c) => (c as { id: string }).id);

        if (tableRemoveChangeIds.length > 0) {
          setAllNodes((currentNodes) =>
            performSoftDelete(tableRemoveChangeIds, currentNodes)
          );
        }
        const nonRemoveTableChanges = tableNodeChanges.filter((c) => c.type !== "remove");
        if (nonRemoveTableChanges.length > 0) {
          setAllNodes((nds) => applyNodeChanges(nonRemoveTableChanges, nds) as AppNode[]);
        }

        // Handle note changes (hard delete)
        const noteRemoveChangeIds = noteChanges
          .filter((c) => c.type === "remove" && "id" in c)
          .map((c) => (c as { id: string }).id);

        if (noteRemoveChangeIds.length > 0) {
          deleteNote(noteRemoveChangeIds);
        }
        const nonRemoveNoteChanges = noteChanges.filter((c) => c.type !== "remove");
        if (nonRemoveNoteChanges.length > 0) {
          setNotes(nds => applyNodeChanges(nonRemoveNoteChanges, nds) as AppNoteNode[]);
        }
      },
      [notes, performSoftDelete, deleteNote]
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
      [onSelectionChange, performSoftDelete]
    );

    const handleNoteUpdate = useCallback((nodeId: string, data: Partial<NoteNodeData>) => {
      setNotes(nds => nds.map(n => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, ...data } };
        }
        return n;
      }));
    }, []);

    // Node types
    const nodeTypes: NodeTypes = useMemo(
      () => ({
        table: (props: NodeProps) => (
          <TableNode
            {...props}
            data={props.data as TableNodeData}
            onDeleteRequest={deleteNode}
          />
        ),
        note: NoteNode,
      }),
      [deleteNode]
    );

    // Initialization
    const onInit = useCallback((instance: unknown) => {
      setRfInstanceLocal(instance as ReactFlowInstance<AppNode, AppEdge>);
      setRfInstance(instance as ReactFlowInstance<AppNode, AppEdge>);
    }, [setRfInstance]);

    const onCreateNoteAtPosition = useCallback((position: { x: number; y: number }) => {
      const newNote: AppNoteNode = {
        id: `note-${+new Date()}`,
        type: 'note',
        position,
        width: 192,
        height: 192,
        data: {
          text: 'New Note',
        },
      };
      setNotes(nds => [...nds, newNote]);
    }, []);

    const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
      if (!rfInstance) return;

      const pane = reactFlowWrapper.current?.getBoundingClientRect();
      if (!pane) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      clickPositionRef.current = position;
    }, [rfInstance]);

    const onNodeContextMenu = (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
    };

    const onEdgeContextMenu = (event: React.MouseEvent, _edge: Edge) => {
      event.preventDefault();
    };

    // Expose methods to parent
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
    }), [deleteNode, undoDelete, onSelectionChange]);

    const notesWithCallbacks = useMemo(() => notes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onUpdate: handleNoteUpdate,
        onDelete: deleteNote,
      }
    })), [notes, handleNoteUpdate, deleteNote]);

    const combinedNodes = useMemo(() => [...visibleNodes, ...notesWithCallbacks], [visibleNodes, notesWithCallbacks]);

    return (
      <div className="w-full h-full" ref={reactFlowWrapper}>
        <ContextMenu>
          <ContextMenuTrigger>
            <ReactFlow
              nodes={combinedNodes}
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
              onPaneContextMenu={onPaneContextMenu}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
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
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => {
              if (clickPositionRef.current) {
                onCreateTableAtPosition(clickPositionRef.current);
              }
            }}
              disabled={isLocked}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Table
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => {
              if (clickPositionRef.current) {
                onCreateNoteAtPosition(clickPositionRef.current);
              }
            }}
              disabled={isLocked}
            >
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    );
  }
);

export default DiagramEditor;