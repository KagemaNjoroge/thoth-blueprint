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
import { Button } from './ui/button';
import { Trash2, Plus } from 'lucide-react';
import TableNode from './TableNode';
import { AddTableDialog } from './AddTableDialog';
import DiagramSelector from './DiagramSelector';
import { relationshipTypes } from './EdgeInspectorPanel';
import CustomEdge from './CustomEdge';

interface DiagramEditorProps {
  diagram: Diagram;
  setSelectedDiagramId: (id: number | null) => void;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
}

const tableColors = [
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', 
  '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#4ADE80',
];

const DiagramEditor = forwardRef(({ diagram, setSelectedDiagramId, onSelectionChange }: DiagramEditorProps, ref) => {
  const [allNodes, setAllNodes] = useState<Node[]>([]); // Holds ALL nodes, including soft-deleted
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  // Filter nodes for rendering, only showing those not marked as deleted
  const visibleNodes = useMemo(() => allNodes.filter(n => !n.data.isDeleted), [allNodes]);

  // Load initial data from the database
  useEffect(() => {
    if (diagram?.data) {
      const initialNodes = (diagram.data.nodes || []).map((node: Node) => ({
        ...node,
        data: {
          ...node.data,
          color: node.data.color || tableColors[Math.floor(Math.random() * tableColors.length)],
          // Ensure deletedAt is a Date object if it exists from storage
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

  // Save ALL nodes (including soft-deleted ones) to the database
  const saveDiagram = useCallback(async () => {
    if (diagram) {
      await db.diagrams.update(diagram.id!, {
        data: { nodes: allNodes, edges, viewport: rfInstance?.getViewport() || {} },
        updatedAt: new Date(),
      });
    }
  }, [diagram, allNodes, edges, rfInstance]);

  useEffect(() => {
    const handler = setTimeout(() => saveDiagram(), 1000);
    return () => clearTimeout(handler);
  }, [allNodes, edges, saveDiagram]);

  // Undo logic based on soft-delete timestamps
  const undoDelete = useCallback(() => {
    setAllNodes(currentNodes => {
      const deletedNodes = currentNodes.filter(n => n.data.isDeleted);
      if (deletedNodes.length === 0) return currentNodes;

      // Find the most recently deleted node
      const lastDeletedNode = deletedNodes.reduce((latest, current) => 
        (latest.data.deletedAt.getTime() > current.data.deletedAt.getTime() ? latest : current)
      );

      // "Undelete" the node by removing the isDeleted flag
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

  // Helper function to perform soft-delete and prune old ones
  const performSoftDelete = (nodeIds: string[], currentNodes: Node[]): Node[] => {
    const now = new Date();
    let newNodes = currentNodes.map(n => {
      if (nodeIds.includes(n.id)) {
        return { ...n, data: { ...n.data, isDeleted: true, deletedAt: now } };
      }
      return n;
    });

    // Pruning logic: keep only the 10 most recent deletes
    const deletedNodes = newNodes.filter(n => n.data.isDeleted).sort((a, b) => a.data.deletedAt.getTime() - b.data.deletedAt.getTime());
    if (deletedNodes.length > 10) {
      const oldestNodeId = deletedNodes[0].id;
      newNodes = newNodes.filter(n => n.id !== oldestNodeId); // Permanent deletion
    }
    return newNodes;
  };

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const removeChangeIds = changes.filter(c => c.type === 'remove').map(c => c.id);
    
    if (removeChangeIds.length > 0) {
      setAllNodes(currentNodes => performSoftDelete(removeChangeIds, currentNodes));
    }

    // Apply other changes (like dragging) to the full node list
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
  }));

  const deleteDiagram = async () => {
    if (confirm("Are you sure you want to delete this diagram?")) {
      await db.diagrams.delete(diagram.id!);
      setSelectedDiagramId(null);
    }
  };

  const handleCreateTable = (tableName: string) => {
    let position = { x: 200, y: 200 };
    if (rfInstance && reactFlowWrapper.current) {
      const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
      const flowPosition = rfInstance.project({ x: width / 2, y: height / 2 });
      position = { x: flowPosition.x - 128, y: flowPosition.y - 50 };
    }
    const newNode: Node = {
      id: `${tableName}-${+new Date()}`, type: 'table', position,
      data: {
        label: tableName,
        color: tableColors[Math.floor(Math.random() * tableColors.length)],
        columns: [{ id: `col_${Date.now()}`, name: 'id', type: 'INT', pk: true, nullable: false }],
      },
    };
    setAllNodes(nds => nds.concat(newNode));
  };

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <div className="absolute top-4 left-4 z-10 flex gap-2 items-center bg-background p-2 rounded-lg border">
        <DiagramSelector selectedDiagramId={diagram.id!} setSelectedDiagramId={setSelectedDiagramId} />
        <Button onClick={() => setIsAddTableDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Table</Button>
        <Button onClick={deleteDiagram} variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
      </div>
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
      <AddTableDialog isOpen={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen} onCreateTable={handleCreateTable} />
    </div>
  );
});

export default DiagramEditor;