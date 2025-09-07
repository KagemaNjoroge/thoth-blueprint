import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  addEdge,
  type Connection,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
  type NodeProps,
  ControlButton,
  Position,
  type ColorMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';
import { db, type Diagram } from '@/lib/db';
import TableNode from './TableNode';
import { relationshipTypes } from './EdgeInspectorPanel';
import CustomEdge from './CustomEdge';
import { Lock, Unlock } from 'lucide-react';
import { type AppNode, type AppEdge, type TableNodeData } from '@/lib/types';

interface DiagramEditorProps {
  diagram: Diagram;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  setRfInstance: (instance: ReactFlowInstance | null) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

const tableColors = [
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', 
  '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#4ADE80',
];

const DiagramEditor = forwardRef(({ diagram, onSelectionChange, setRfInstance, selectedNodeId, selectedEdgeId }: DiagramEditorProps, ref) => {
  const [allNodes, setAllNodes] = useState<AppNode[]>([]);
  const [edges, setEdges] = useState<AppEdge[]>([]);
  const [rfInstance, setRfInstanceLocal] = useState<ReactFlowInstance | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const visibleNodes = useMemo(() => allNodes.filter(n => !n.data.isDeleted), [allNodes]);
  const isLocked = diagram.data.isLocked ?? false;

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: AppEdge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const processedEdges = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = allNodes.find(n => n.id === edge.source);
      const targetNode = allNodes.find(n => n.id === edge.target);

      let sourcePosition = Position.Right;
      let targetPosition = Position.Left;

      if (sourceNode && targetNode) {
        const sourceNodeCenter = sourceNode.position.x + (sourceNode.width || 256) / 2;
        const targetNodeCenter = targetNode.position.x + (targetNode.width || 256) / 2;

        if (sourceNodeCenter > targetNodeCenter) {
          sourcePosition = Position.Left;
          targetPosition = Position.Right;
        }
      }

      return {
        ...edge,
        sourcePosition,
        targetPosition,
        data: {
            ...edge.data,
            isHighlighted: 
              edge.source === selectedNodeId || 
              edge.target === selectedNodeId ||
              edge.id === selectedEdgeId ||
              edge.id === hoveredEdgeId,
        }
      };
    });
  }, [edges, allNodes, selectedNodeId, selectedEdgeId, hoveredEdgeId]);

  const handleLockChange = useCallback(() => {
    if (diagram && diagram.id) {
      db.diagrams.update(diagram.id, {
        'data.isLocked': !isLocked,
        updatedAt: new Date(),
      });
    }
  }, [diagram, isLocked]);

  useEffect(() => {
    if (diagram?.data) {
      let wasModified = false;
      const initialNodes: AppNode[] = (diagram.data.nodes || []).map((node: AppNode, index: number) => {
        if (node.data.order === undefined || node.data.order === null) {
          wasModified = true;
        }
        return {
          ...node,
          data: {
            ...node.data,
            order: node.data.order ?? index,
            color: node.data.color || tableColors[Math.floor(Math.random() * tableColors.length)],
            deletedAt: node.data.deletedAt ? new Date(node.data.deletedAt) : undefined,
          },
        };
      });
      const initialEdges: AppEdge[] = (diagram.data.edges || []).map(edge => ({ ...edge, type: 'custom' }));
      
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

  const saveDiagram = useCallback(async () => {
    if (diagram && rfInstance) {
      await db.diagrams.update(diagram.id!, {
        data: { ...diagram.data, nodes: allNodes, edges, viewport: rfInstance.getViewport() },
        updatedAt: new Date(),
      });
    }
  }, [diagram, allNodes, edges, rfInstance]);

  useEffect(() => {
    const handler = setTimeout(() => saveDiagram(), 1000);
    return () => clearTimeout(handler);
  }, [allNodes, edges, saveDiagram]);

  const undoDelete = useCallback(() => {
    setAllNodes(currentNodes => {
      const deletedNodes = currentNodes.filter(n => n.data.isDeleted && n.data.deletedAt);
      if (deletedNodes.length === 0) return currentNodes;

      const lastDeletedNode = deletedNodes.reduce((latest, current) => 
        (latest.data.deletedAt!.getTime() > current.data.deletedAt!.getTime() ? latest : current)
      );

      return currentNodes.map(n => {
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
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        undoDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoDelete]);

  const performSoftDelete = (nodeIds: string[], currentNodes: AppNode[]): AppNode[] => {
    const now = new Date();
    let newNodes = currentNodes.map(n => {
      if (nodeIds.includes(n.id)) {
        return { ...n, data: { ...n.data, isDeleted: true, deletedAt: now } };
      }
      return n;
    });

    const deletedNodes = newNodes.filter(n => n.data.isDeleted && n.data.deletedAt).sort((a, b) => a.data.deletedAt!.getTime() - b.data.deletedAt!.getTime());
    if (deletedNodes.length > 10) {
      const oldestNodeId = deletedNodes[0].id;
      newNodes = newNodes.filter(n => n.id !== oldestNodeId);
    }
    return newNodes;
  };

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const removeChangeIds = changes.filter(c => c.type === 'remove').map(c => c.id);
    
    if (removeChangeIds.length > 0) {
      setAllNodes(currentNodes => performSoftDelete(removeChangeIds, currentNodes));
    }

    const nonRemoveChanges = changes.filter(c => c.type !== 'remove');
    if (nonRemoveChanges.length > 0) {
      setAllNodes(nds => applyNodeChanges(nonRemoveChanges, nds));
    }
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge: AppEdge = { ...connection, type: 'custom', data: { relationship: relationshipTypes[1].value } };
    setEdges((eds) => addEdge(newEdge, eds));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setAllNodes(currentNodes => performSoftDelete([nodeId], currentNodes));
    onSelectionChange({ nodes: [], edges: [] });
  }, [onSelectionChange]);

  const nodeTypes = useMemo(() => ({
    table: (props: NodeProps<TableNodeData>) => <TableNode {...props} onDeleteRequest={deleteNode} />
  }), [deleteNode]);

  const onInit = (instance: ReactFlowInstance) => {
    setRfInstanceLocal(instance);
    setRfInstance(instance);
  };

  useImperativeHandle(ref, () => ({
    updateNode: (updatedNode: AppNode) => {
      setAllNodes((nds) => nds.map((node) => node.id === updatedNode.id ? { ...node, data: { ...updatedNode.data } } : node));
    },
    deleteNode: deleteNode,
    updateEdge: (updatedEdge: AppEdge) => {
      setEdges((eds) => eds.map((edge) => edge.id === updatedEdge.id ? updatedEdge : edge));
    },
    deleteEdge: (edgeId: string) => {
      setEdges(eds => eds.filter(e => e.id !== edgeId));
      onSelectionChange({ nodes: [], edges: [] });
    },
    addNode: (newNode: AppNode) => {
      setAllNodes(nds => nds.concat(newNode));
    },
    undoDelete: undoDelete,
    batchUpdateNodes: (nodesToUpdate: AppNode[]) => {
        const nodeUpdateMap = new Map(nodesToUpdate.map(n => [n.id, n]));
        setAllNodes(currentNodes => 
            currentNodes.map(node => nodeUpdateMap.get(node.id) || node)
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
        deleteKeyCode={isLocked ? null : ['Backspace', 'Delete']}
        fitView
        colorMode={theme as ColorMode}
      >
        <Controls showInteractive={false}>
          <ControlButton
            onClick={handleLockChange}
            title={isLocked ? 'Unlock' : 'Lock'}
            className="flex items-center justify-center"
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </ControlButton>
        </Controls>
        <Background />
      </ReactFlow>
    </div>
  );
});

export default DiagramEditor;