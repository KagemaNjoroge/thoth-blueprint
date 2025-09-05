import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  addEdge,
  Connection,
  OnSelectionChangeParams,
  ReactFlowInstance,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { db, Diagram } from '@/lib/db';
import TableNode from './TableNode';
import { relationshipTypes } from './EdgeInspectorPanel';
import CustomEdge from './CustomEdge';

interface DiagramEditorProps {
  diagram: Diagram;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  setRfInstance: (instance: ReactFlowInstance | null) => void;
}

const tableColors = [
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', 
  '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#4ADE80',
];

const DiagramEditor = forwardRef(({ diagram, onSelectionChange, setRfInstance }: DiagramEditorProps, ref) => {
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const visibleNodes = useMemo(() => allNodes.filter(n => !n.data.isDeleted), [allNodes]);

  useEffect(() => {
    if (diagram?.data) {
      const initialNodes = (diagram.data.nodes || []).map((node: Node) => ({
        ...node,
        data: {
          ...node.data,
          color: node.data.color || tableColors[Math.floor(Math.random() * tableColors.length)],
          deletedAt: node.data.deletedAt ? new Date(node.data.deletedAt) : undefined,
        },
      }));
      const initialEdges = (diagram.data.edges || []).map(edge => ({ ...edge, type: 'custom' }));
      
      setAllNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [diagram]);

  useEffect(() => {
    onSelectionChange({ nodes: [], edges: [] });
  }, [diagram.id, onSelectionChange]);

  const saveDiagram = useCallback(async (rfInstance: ReactFlowInstance | null) => {
    if (diagram && rfInstance) {
      await db.diagrams.update(diagram.id!, {
        data: { nodes: allNodes, edges, viewport: rfInstance.getViewport() },
        updatedAt: new Date(),
      });
    }
  }, [diagram, allNodes, edges]);

  useEffect(() => {
    const instance = (ref as any)?.current?.rfInstance;
    const handler = setTimeout(() => saveDiagram(instance), 1000);
    return () => clearTimeout(handler);
  }, [allNodes, edges, saveDiagram, ref]);

  const undoDelete = useCallback(() => {
    setAllNodes(currentNodes => {
      const deletedNodes = currentNodes.filter(n => n.data.isDeleted);
      if (deletedNodes.length === 0) return currentNodes;

      const lastDeletedNode = deletedNodes.reduce((latest, current) => 
        (latest.data.deletedAt.getTime() > current.data.deletedAt.getTime() ? latest : current)
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

  const performSoftDelete = (nodeIds: string[], currentNodes: Node[]): Node[] => {
    const now = new Date();
    let newNodes = currentNodes.map(n => {
      if (nodeIds.includes(n.id)) {
        return { ...n, data: { ...n.data, isDeleted: true, deletedAt: now } };
      }
      return n;
    });

    const deletedNodes = newNodes.filter(n => n.data.isDeleted).sort((a, b) => a.data.deletedAt.getTime() - b.data.deletedAt.getTime());
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
    const newEdge = { ...connection, type: 'custom', data: { relationship: relationshipTypes[1].value } };
    setEdges((eds) => addEdge(newEdge, eds));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setAllNodes(currentNodes => performSoftDelete([nodeId], currentNodes));
    onSelectionChange({ nodes: [], edges: [] });
  }, [onSelectionChange]);

  const nodeTypes = useMemo(() => ({
    table: (props: NodeProps) => <TableNode {...props} onDeleteRequest={deleteNode} />
  }), [deleteNode]);

  useImperativeHandle(ref, () => ({
    updateNode: (updatedNode: Node) => {
      setAllNodes((nds) => nds.map((node) => node.id === updatedNode.id ? { ...node, data: { ...updatedNode.data } } : node));
    },
    deleteNode: deleteNode,
    updateEdge: (updatedEdge: Edge) => {
      setEdges((eds) => eds.map((edge) => edge.id === updatedEdge.id ? updatedEdge : edge));
    },
    deleteEdge: (edgeId: string) => {
      setEdges(eds => eds.filter(e => e.id !== edgeId));
      onSelectionChange({ nodes: [], edges: [] });
    },
    addNode: (newNode: Node) => {
      setAllNodes(nds => nds.concat(newNode));
    },
    undoDelete: undoDelete,
    reorderNodesByIds: (orderedIds: string[]) => {
        setAllNodes((currentNodes) => {
            const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
            const orderedVisibleNodes = orderedIds.map(id => nodeMap.get(id)).filter(Boolean) as Node[];
            const otherNodes = currentNodes.filter(n => !orderedIds.includes(n.id));
            return [...orderedVisibleNodes, ...otherNodes];
        });
    },
  }));

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={visibleNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setRfInstance}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
});

export default DiagramEditor;