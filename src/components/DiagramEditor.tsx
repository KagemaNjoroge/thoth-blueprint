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
  NodeChange,
  EdgeChange,
  OnSelectionChangeParams,
  ReactFlowInstance,
  ControlButton,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { db, Diagram } from '@/lib/db';
import { Button } from './ui/button';
import { Trash2, Plus, Undo, Redo } from 'lucide-react';
import TableNode from './TableNode';
import { AddTableDialog } from './AddTableDialog';
import DiagramSelector from './DiagramSelector';
import { relationshipTypes } from './EdgeInspectorPanel';
import CustomEdge from './CustomEdge';
import { useUndoableState } from '@/hooks/useUndoableState';
import { useDebouncedCallback } from 'use-debounce';

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
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const {
    state: historyState,
    setState: setHistoryState,
    resetState: resetHistoryState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState({ nodes: [], edges: [] });

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  useEffect(() => {
    if (historyState) {
      setNodes(historyState.nodes);
      setEdges(historyState.edges);
    }
  }, [historyState]);

  const commitToHistory = useDebouncedCallback(() => {
    setHistoryState({ nodes, edges });
  }, 300);

  useEffect(() => {
    if (diagram?.data) {
      const nodesWithColor = (diagram.data.nodes || []).map((node: Node) => ({
        ...node,
        data: {
          ...node.data,
          color: node.data.color || tableColors[Math.floor(Math.random() * tableColors.length)],
        },
      }));
      const updatedEdges = (diagram.data.edges || []).map(edge => ({ ...edge, type: 'custom' }));
      
      setNodes(nodesWithColor);
      setEdges(updatedEdges);
      resetHistoryState({ nodes: nodesWithColor, edges: updatedEdges });
    }
  }, [diagram, resetHistoryState]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === 'z') {
          event.preventDefault();
          undo();
        } else if (event.key === 'y' || (event.shiftKey && event.key === 'z')) {
          event.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useImperativeHandle(ref, () => ({
    updateNode: (updatedNode: Node) => handleNodeUpdate(updatedNode),
    deleteNode: (nodeId: string) => handleNodeDelete(nodeId),
    updateEdge: (updatedEdge: Edge) => handleEdgeUpdate(updatedEdge),
    deleteEdge: (edgeId: string) => handleEdgeDelete(edgeId),
  }));

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    commitToHistory();
  }, [commitToHistory]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    commitToHistory();
  }, [commitToHistory]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge = { ...connection, type: 'custom', data: { relationship: relationshipTypes[1].value } };
    setEdges((eds) => addEdge(newEdge, eds));
    commitToHistory.flush();
  }, [commitToHistory]);

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
    setNodes((nds) => nds.concat(newNode));
    commitToHistory.flush();
  };

  const handleNodeUpdate = (updatedNode: Node) => {
    setNodes((nds) => nds.map((node) => node.id === updatedNode.id ? { ...node, data: { ...updatedNode.data } } : node));
    commitToHistory();
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    onSelectionChange({ nodes: [], edges: [] });
    commitToHistory.flush();
  };

  const handleEdgeUpdate = (updatedEdge: Edge) => {
    setEdges((eds) => eds.map((edge) => edge.id === updatedEdge.id ? updatedEdge : edge));
    commitToHistory();
  };

  const handleEdgeDelete = (edgeId: string) => {
    setEdges((eds) => eds.filter(e => e.id !== edgeId));
    onSelectionChange({ nodes: [], edges: [] });
    commitToHistory.flush();
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
        <Controls>
          <ControlButton onClick={undo} disabled={!canUndo} title="undo">
            <Undo className="h-4 w-4" />
          </ControlButton>
          <ControlButton onClick={redo} disabled={!canRedo} title="redo">
            <Redo className="h-4 w-4" />
          </ControlButton>
        </Controls>
        <Background />
      </ReactFlow>
      <AddTableDialog isOpen={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen} onCreateTable={handleCreateTable} />
    </div>
  );
});

export default DiagramEditor;