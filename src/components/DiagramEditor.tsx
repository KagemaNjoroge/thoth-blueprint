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
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [deletedNodesStack, setDeletedNodesStack] = useState<Node[]>([]);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  useEffect(() => {
    if (diagram?.data) {
      const initialNodes = (diagram.data.nodes || []).map((node: Node) => ({
        ...node,
        data: {
          ...node.data,
          color: node.data.color || tableColors[Math.floor(Math.random() * tableColors.length)],
        },
      }));
      const initialEdges = (diagram.data.edges || []).map(edge => ({ ...edge, type: 'custom' }));
      
      setNodes(initialNodes);
      setEdges(initialEdges);
      setDeletedNodesStack([]); // Clear undo history when diagram changes
    }
  }, [diagram]);

  useEffect(() => {
    onSelectionChange({ nodes: [], edges: [] });
  }, [diagram.id, onSelectionChange]);

  const saveDiagram = useCallback(async () => {
    if (diagram) {
      await db.diagrams.update(diagram.id!, {
        data: { nodes, edges, viewport: rfInstance?.getViewport() || {} },
        updatedAt: new Date(),
      });
    }
  }, [diagram, nodes, edges, rfInstance]);

  useEffect(() => {
    const handler = setTimeout(() => saveDiagram(), 1000);
    return () => clearTimeout(handler);
  }, [nodes, edges, saveDiagram]);

  const undoDelete = useCallback(() => {
    if (deletedNodesStack.length === 0) return;

    const newDeletedNodesStack = [...deletedNodesStack];
    const nodeToRestore = newDeletedNodesStack.pop();

    if (nodeToRestore) {
      setNodes(nds => [...nds, nodeToRestore]);
      setDeletedNodesStack(newDeletedNodesStack);
    }
  }, [deletedNodesStack]);

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

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const removeChanges = changes.filter(c => c.type === 'remove');
    if (removeChanges.length > 0) {
      const removedNodeIds = new Set(removeChanges.map(c => c.id));
      const nodesToRemove = nodes.filter(n => removedNodeIds.has(n.id));
      setDeletedNodesStack(prev => [...prev, ...nodesToRemove]);
    }
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [nodes]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge = { ...connection, type: 'custom', data: { relationship: relationshipTypes[1].value } };
    setEdges((eds) => addEdge(newEdge, eds));
  }, []);

  useImperativeHandle(ref, () => ({
    updateNode: (updatedNode: Node) => {
      setNodes((nds) => nds.map((node) => node.id === updatedNode.id ? { ...node, data: { ...updatedNode.data } } : node));
    },
    deleteNode: (nodeId: string) => {
      const nodeToDelete = nodes.find(n => n.id === nodeId);
      if (nodeToDelete) {
        setDeletedNodesStack(prev => [...prev, nodeToDelete]);
      }
      setNodes(nds => nds.filter(n => n.id !== nodeId));
      onSelectionChange({ nodes: [], edges: [] });
    },
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
    setNodes(nds => nds.concat(newNode));
  };

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <div className="absolute top-4 left-4 z-10 flex gap-2 items-center bg-background p-2 rounded-lg border">
        <DiagramSelector selectedDiagramId={diagram.id!} setSelectedDiagramId={setSelectedDiagramId} />
        <Button onClick={() => setIsAddTableDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Table</Button>
        <Button onClick={deleteDiagram} variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
      </div>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
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