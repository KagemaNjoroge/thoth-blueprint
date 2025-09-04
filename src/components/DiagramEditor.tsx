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
  EdgeChange,
  OnSelectionChangeParams,
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
  '#34D399', // Green
  '#60A5FA', // Blue
  '#FBBF24', // Amber
  '#F87171', // Red
  '#A78BFA', // Violet
  '#2DD4BF', // Teal
  '#F472B6', // Pink
  '#FB923C', // Orange
  '#818CF8', // Indigo
  '#4ADE80', // Lime
];

const DiagramEditor = forwardRef(({ diagram, setSelectedDiagramId, onSelectionChange }: DiagramEditorProps, ref) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  useEffect(() => {
    if (diagram?.data) {
      setNodes(diagram.data.nodes || []);
      const updatedEdges = (diagram.data.edges || []).map(edge => ({
        ...edge,
        type: 'custom',
      }));
      setEdges(updatedEdges);
    }
  }, [diagram]);

  useEffect(() => {
    onSelectionChange({ nodes: [], edges: [] });
  }, [diagram.id, onSelectionChange]);

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
    }, 1000);

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
    },
    updateEdge(updatedEdge: Edge) {
      handleEdgeUpdate(updatedEdge);
    },
    deleteEdge(edgeId: string) {
      handleEdgeDelete(edgeId);
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
        const defaultRelationship = relationshipTypes[1]; // One-to-Many
        const newEdge = {
            ...connection,
            type: 'custom',
            data: { relationship: defaultRelationship.value },
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
    const randomColor = tableColors[Math.floor(Math.random() * tableColors.length)];
    const newNode: Node = {
      id: `${tableName}-${+new Date()}`,
      type: 'table',
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      data: { 
        label: tableName,
        color: randomColor,
        columns: [
            { id: `col_${Date.now()}`, name: 'id', type: 'INT', pk: true, nullable: false },
        ]
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

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
    onSelectionChange({ nodes: [], edges: [] });
  }

  const handleEdgeUpdate = (updatedEdge: Edge) => {
    setEdges((eds) =>
      eds.map((edge) => (edge.id === updatedEdge.id ? updatedEdge : edge))
    );
  };

  const handleEdgeDelete = (edgeId: string) => {
    const edgeChanges: EdgeChange[] = [{ id: edgeId, type: 'remove' }];
    setEdges((eds) => applyEdgeChanges(edgeChanges, eds));
    onSelectionChange({ nodes: [], edges: [] });
  };

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
            edgeTypes={edgeTypes}
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