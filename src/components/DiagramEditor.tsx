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
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from './ui/button';
import { Save, Trash2, Plus } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import TableNode from './TableNode';
import { AddTableDialog } from './AddTableDialog';
import DiagramSelector from './DiagramSelector';

interface DiagramEditorProps {
  diagramId: number;
  setSelectedDiagramId: (id: number | null) => void;
  onNodeSelect: (node: Node | null) => void;
}

const DiagramEditor = forwardRef(({ diagramId, setSelectedDiagramId, onNodeSelect }: DiagramEditorProps, ref) => {
  const diagram = useLiveQuery(() => db.diagrams.get(diagramId), [diagramId]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  useEffect(() => {
    if (diagram?.data) {
      setNodes(diagram.data.nodes || []);
      setEdges(diagram.data.edges || []);
    }
    onNodeSelect(null);
  }, [diagram, onNodeSelect]);

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

  const saveDiagram = async () => {
    if (diagram) {
      await db.diagrams.update(diagramId, {
        data: { nodes, edges, viewport: {} },
        updatedAt: new Date(),
      });
      showSuccess("Diagram saved successfully!");
    }
  };

  const deleteDiagram = async () => {
    if (confirm("Are you sure you want to delete this diagram?")) {
        await db.diagrams.delete(diagramId);
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
            { name: 'id', type: 'INT', pk: true },
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
            <DiagramSelector selectedDiagramId={diagramId} setSelectedDiagramId={setSelectedDiagramId} />
            <Button onClick={() => setIsAddTableDialogOpen(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Table</Button>
            <Button onClick={saveDiagram} size="sm"><Save className="h-4 w-4 mr-2" /> Save</Button>
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