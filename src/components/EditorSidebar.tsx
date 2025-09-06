import { useState, useEffect, useMemo } from "react";
import { Diagram } from "@/lib/db";
import { Node, Edge } from "reactflow";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2, Edit, GitCommitHorizontal, ArrowLeft, BrainCircuit, Table, GripVertical, Plus } from "lucide-react";
import TableAccordionContent from "./TableAccordionContent";
import EdgeInspectorPanel from "./EdgeInspectorPanel";
import { ScrollArea } from "./ui/scroll-area";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EditorSidebarProps {
  diagram: Diagram;
  activeItemId: string | null;
  onActiveItemIdChange: (id: string | null) => void;
  onNodeUpdate: (node: Node) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeUpdate: (edge: Edge) => void;
  onEdgeDelete: (edgeId: string) => void;
  onAddTable: () => void;
  onDeleteDiagram: () => void;
  onBackToGallery: () => void;
  onUndoDelete: () => void;
  onBatchNodeUpdate: (nodes: Node[]) => void;
}

function SortableAccordionItem({ node, children }: { node: Node, children: (attributes: any, listeners: any) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children(attributes, listeners)}
        </div>
    );
}

export default function EditorSidebar({
  diagram,
  activeItemId,
  onActiveItemIdChange,
  onNodeUpdate,
  onNodeDelete,
  onEdgeUpdate,
  onEdgeDelete,
  onAddTable,
  onDeleteDiagram,
  onBackToGallery,
  onUndoDelete,
  onBatchNodeUpdate,
}: EditorSidebarProps) {
  const [editingTableName, setEditingTableName] = useState<string | null>(null);
  const [tableName, setTableName] = useState("");
  const [currentTab, setCurrentTab] = useState("tables");

  const sortedNodesFromProp = useMemo(() => 
    (diagram.data.nodes || [])
      .filter(n => !n.data.isDeleted)
      .sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity)),
    [diagram.data.nodes]
  );

  const [nodes, setNodes] = useState(sortedNodesFromProp);

  useEffect(() => {
    setNodes(sortedNodesFromProp);
  }, [sortedNodesFromProp]);

  const edges = diagram.data.edges || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (activeItemId) {
      if (nodes.some(n => n.id === activeItemId)) {
        setCurrentTab("tables");
      } else if (edges.some(e => e.id === activeItemId)) {
        setCurrentTab("relationships");
      }
    }
  }, [activeItemId, nodes, edges]);

  const handleTabChange = (tab: string) => {
    if (tab !== currentTab) {
      setCurrentTab(tab);
      onActiveItemIdChange(null);
    }
  };

  const handleStartEdit = (node: Node) => {
    setEditingTableName(node.id);
    setTableName(node.data.label);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableName(e.target.value);
  };

  const handleNameSave = (node: Node) => {
    onNodeUpdate({ ...node, data: { ...node.data, label: tableName } });
    setEditingTableName(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = nodes.findIndex((n) => n.id === active.id);
        const newIndex = nodes.findIndex((n) => n.id === over.id);
        
        const reorderedNodes = arrayMove(nodes, oldIndex, newIndex);
        setNodes(reorderedNodes);
        
        const nodesToUpdate = reorderedNodes.map((node, index) => ({
            ...node,
            data: {
                ...node.data,
                order: index,
            }
        }));

        onBatchNodeUpdate(nodesToUpdate);
    }
  };

  const inspectingEdge = edges.find(e => e.id === activeItemId);

  return (
    <div className="h-full w-full flex flex-col bg-card">
      <div className="flex items-center border-b pl-2 flex-shrink-0">
        <BrainCircuit className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
        <Menubar className="rounded-none border-none bg-transparent">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={onBackToGallery}>Back to Gallery</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={onAddTable}>
                Add Table <MenubarShortcut>⌘N/A</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Export as SQL (coming soon)</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={onDeleteDiagram} className="text-destructive focus:text-destructive">
                Delete Diagram
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={onUndoDelete}>
                Undo Delete Table <MenubarShortcut>⌘Z</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Settings</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Theme (coming soon)</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
      <div className="p-2 flex-shrink-0">
        <h3 className="text-lg font-semibold tracking-tight px-2">{diagram.name}</h3>
        <p className="text-sm text-muted-foreground px-2">{diagram.dbType}</p>
      </div>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0 px-4 mb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <TabsList className="grid w-full sm:w-auto grid-cols-2">
                    <TabsTrigger value="tables"><Table className="h-4 w-4 mr-2" />Tables ({nodes.length})</TabsTrigger>
                    <TabsTrigger value="relationships"><GitCommitHorizontal className="h-4 w-4 mr-2" />Relationships ({edges.length})</TabsTrigger>
                </TabsList>
                <Button variant="outline" size="sm" onClick={onAddTable} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                </Button>
            </div>
        </div>
        <div className="flex-grow min-h-0">
            <TabsContent value="tables" className="m-0 h-full">
                <ScrollArea className="h-full px-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                        <Accordion type="single" collapsible value={activeItemId || undefined} onValueChange={onActiveItemIdChange} className="w-full">
                        {nodes.map((node) => (
                            <SortableAccordionItem key={node.id} node={node}>
                            {(attributes, listeners) => (
                                <AccordionItem value={node.id} className="border rounded-md mb-1 data-[state=open]:bg-accent/50">
                                <AccordionTrigger className="px-2 group hover:no-underline">
                                    <div className="flex items-center gap-2 w-full">
                                    <div {...attributes} {...listeners} className="cursor-grab p-1 -ml-1">
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.data.color }} />
                                    {editingTableName === node.id ? (
                                        <Input
                                        value={tableName}
                                        onChange={handleNameChange}
                                        onBlur={() => handleNameSave(node)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNameSave(node)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-8"
                                        autoFocus
                                        />
                                    ) : (
                                        <span className="truncate" onDoubleClick={() => handleStartEdit(node)}>{node.data.label}</span>
                                    )}
                                    <div className="flex-grow" />
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <TableAccordionContent 
                                    node={node} 
                                    dbType={diagram.dbType} 
                                    onNodeUpdate={onNodeUpdate} 
                                    onNodeDelete={onNodeDelete}
                                    onStartEdit={() => handleStartEdit(node)}
                                    />
                                </AccordionContent>
                                </AccordionItem>
                            )}
                            </SortableAccordionItem>
                        ))}
                        </Accordion>
                    </SortableContext>
                    </DndContext>
                </ScrollArea>
            </TabsContent>
            <TabsContent value="relationships" className="m-0 h-full">
                <ScrollArea className="h-full p-4">
                    {inspectingEdge ? (
                        <div>
                        <Button variant="ghost" onClick={() => onActiveItemIdChange(null)} className="mb-2">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
                        </Button>
                        <EdgeInspectorPanel 
                            edge={inspectingEdge}
                            nodes={nodes}
                            onEdgeUpdate={onEdgeUpdate}
                            onEdgeDelete={onEdgeDelete}
                        />
                        </div>
                    ) : (
                        <div className="space-y-2">
                        {edges.map(edge => {
                            const sourceNode = nodes.find(n => n.id === edge.source);
                            const targetNode = nodes.find(n => n.id === edge.target);
                            return (
                            <Button key={edge.id} variant="ghost" className="w-full justify-start h-auto py-2" onClick={() => onActiveItemIdChange(edge.id)}>
                                <GitCommitHorizontal className="h-4 w-4 mr-2 flex-shrink-0" />
                                <div className="text-left text-sm">
                                <p className="font-semibold">{sourceNode?.data.label} to {targetNode?.data.label}</p>
                                <p className="text-muted-foreground text-xs">{edge.data?.relationship || 'one-to-many'}</p>
                                </div>
                            </Button>
                            );
                        })}
                        </div>
                    )}
                </ScrollArea>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}