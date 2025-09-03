import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from './ui/button';
import { Save, Trash2, Plus } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import TableNode from './TableNode';

interface DiagramEditorProps {
  diagramId: number;
  setSelectedDiagramId: (id: number | null) => void;
}

export default function DiagramEditor({ diagramId, setSelectedDiagramId }: DiagramEditorProps) {
  const diagram = useLiveQuery(() => db.diagrams.get(diagramId), [diagramId]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);

  useEffect(() => {
    if (diagram?.data) {
      setNodes(diagram.data.nodes || []);
      setEdges(diagram.data.edges || []);
    }
  }, [diagram]);

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
        data: { nodes, edges, viewport: {} }, // viewport saving can be added later
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

  const addTable = () => {
    const tableName = prompt("Enter table name:", "new_table");
    if (!tableName) return;

    const newNode: Node = {
      id: `${tableName}-${+new Date()}`,
      type: 'table',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: tableName,
        columns: [
            { name: 'id', type: 'INT', pk: true },
            { name: 'name', type: 'VARCHAR(255)' },
        ]
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button onClick={addTable} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Table</Button>
            <Button onClick={saveDiagram} size="sm"><Save className="h-4 w-4 mr-2" /> Save</Button>
            <Button onClick={deleteDiagram} variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
        </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}