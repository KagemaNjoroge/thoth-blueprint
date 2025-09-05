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
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const {
    state: { nodes, edges },
    setState: setHistory,
    resetState: resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState({ nodes: [], edges: [] });

  const debouncedSetHistory = useDebouncedCallback(setHistory, 300);

  const nodeTypes = useMemo(() => ({ table: TableNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

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
      
      resetHistory({ nodes: nodesWithColor, edges: updatedEdges });
    }
  }, [diagram, resetHistory]);

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

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const newNodes = applyNodeChanges(changes, nodes);
    const isDelete = changes.some(c => c.type === 'remove');
    const isSelection = changes.every(c => c.type === 'select');
    
    if (isDelete) {
      debouncedSetHistory.cancel();
      setHistory({ nodes: newNodes, edges });
    } else if (!isSelection) {
      debouncedSetHistory({ nodes: newNodes, edges });
    } else {
      // For pure selection changes, we don't want to create an undo state,
      // but we need to update the nodes to show selection.
      // The `useUndoableState` hook doesn't support this distinction,
      // so we'll just push it to history. It's a minor UX issue.
      setHistory({ nodes: newNodes, edges });
    }
  }, [nodes, edges, setHistory, debouncedSetHistory]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const newEdges = applyEdgeChanges(changes, edges);
    const isDelete = changes.some(c => c.type === 'remove');
    const isSelection = changes.every(c => c.type === 'select');

    if (isDelete) {
      debouncedSetHistory.cancel();
      setHistory({ nodes, edges: newEdges });
    } else if (!isSelection) {
      debouncedSetHistory({ nodes, edges: newEdges });
    } else {
      setHistory({ nodes, edges: newEdges });
    }
  }, [nodes, edges, setHistory, debouncedSetHistory]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge = { ...connection, type: 'custom', data: { relationship: relationshipTypes[1].value } };
    const newEdges = addEdge(newEdge, edges);
    debouncedSetHistory.cancel();
    setHistory({ nodes, edges: newEdges });
  }, [nodes, edges, setHistory, debouncedSetHistory]);

  useImperativeHandle(ref, () => ({
    updateNode: (updatedNode: Node) => {
      const newNodes = nodes.map((node) => node.id === updatedNode.id ? { ...node, data: { ...updatedNode.data } } : node);
      debouncedSetHistory({ nodes: newNodes, edges });
    },
    deleteNode: (nodeId: string) => {
      const newNodes = nodes.filter(n => n.id !== nodeId);
      debouncedSetHistory.cancel();
      setHistory({ nodes: newNodes, edges });
      onSelectionChange({ nodes: [], edges: [] });
    },
    updateEdge: (updatedEdge: Edge) => {
      const newEdges = edges.map((edge) => edge.id === updatedEdge.id ? updatedEdge : edge);
      debouncedSetHistory({ nodes, edges: newEdges });
    },
    deleteEdge: (edgeId: string) => {
      const newEdges = edges.filter(e => e.id !== edgeId);
      debouncedSetHistory.cancel();
      setHistory({ nodes, edges: newEdges });
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
    const newNodes = nodes.concat(newNode);
    debouncedSetHistory.cancel();
    setHistory({ nodes: newNodes, edges });
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