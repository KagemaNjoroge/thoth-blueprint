import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
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
  NodeChange,
  OnSelectionChangeParams,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { db, Diagram } from '@/lib/db';
import { Button } from './ui/button';
import { Trash2, Plus } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import TableNode from './TableNode';
import { AddTableDialog } from './AddTableDialog';
import DiagramSelector from './DiagramSelector';

interface DiagramEditorProps {
  diagram: Diagram;
  setSelectedDiagramId: (id: number | null) => void;
  onNodeSelect: (node: Node | null) => void;
}

const DiagramEditor = forwardRef(({ diagram, setSelectedDiagramId, onNodeSelect }: DiagramEditorProps, ref) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  // This effect now only updates the nodes and edges when the diagram data changes.
  useEffect(() => {
    if (diagram?.data) {
      setNodes(diagram.data.nodes || []);
      setEdges(diagram.data.edges || []);
    }
  }, [diagram]);

  // This new effect clears the selection ONLY when the diagram ID changes.
  useEffect(() => {
    onNodeSelect(null);
  }, [diagram.id, onNodeSelect]);

  const saveDiagram = useCallback(async () => {
    if (diagram) {
      await db.diagrams.update(diagram.id!, {
        data: { nodes, edges, viewport: {} },
        updatedAt: new Date(),
      });
    }
  }, [diagram, nodes, edges]);

  useEffect(() => {
    const handler = setTimeout(() => {
      saveDiagram();
    }, 1000); // Autosave after 1 second of inactivity

    return () => {
      clearTimeout(handler);
    };
  }, [nodes, edges, saveDiagram]);

  useImperativeHandle(ref, () => ({
    updateNode(updatedNode: Node) {
      handleNodeUpdate(updatedNode);
    },
    deleteNode(nodeId: string) {
      handleNodeDelete(nodeId);
    }
  }));

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
        const newEdge = {
            ...connection,
            type: 'smoothstep',
            markerEnd: { type: 'arrowclosed' },
        };
        setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  );

  const deleteDiagram = async () => {
    if (confirm("Are you sure you want to delete this diagram?")) {
        await db.diagrams.delete(diagram.id!);
        setSelectedDiagramId(null);
    }
  }

  const handleCreateTable = (tableName: string) => {
    const newNode: Node = {
      id: `${tableName}-${+new Date()}`,
      type: 'table',
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      data: { 
        label: tableName,
        columns: [
            { id: `col_${Date.now()}`, name: 'id', type: 'INT', pk: true, nullable: false },
        ]
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    onNodeSelect(nodes.length === 1 ? nodes[0] : null);
  }, [onNodeSelect]);

  const handleNodeUpdate = (updatedNode: Node) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === updatedNode.id) {
          return { ...node, data: { ...updatedNode.data } };
        }
        return node;
      })
    );
  };

  const handleNodeDelete = (nodeId: string) => {
    const nodeChanges: NodeChange[] = [{ id: nodeId, type: 'remove' }];
    setNodes((nds) => applyNodeChanges(nodeChanges, nds));
    onNodeSelect(null);
  }

  return (
    <div className="w-full h-full relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center bg-background p-2 rounded-lg border">
            <DiagramSelector selectedDiagramId={diagram.id!} setSelectedDiagramId={setSelectedDiagramId} />
            <Button onClick={() => setIsAddTableDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Table</Button>
            <Button onClick={deleteDiagram} variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
        </div>
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
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