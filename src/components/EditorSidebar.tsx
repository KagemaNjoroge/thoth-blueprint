import { useState, useEffect } from "react";
import { Diagram } from "@/lib/db";
import { Node, Edge } from "reactflow";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2, Edit, GitCommitHorizontal, ArrowLeft } from "lucide-react";
import TableAccordionContent from "./TableAccordionContent";
import EdgeInspectorPanel from "./EdgeInspectorPanel";
import { ScrollArea } from "./ui/scroll-area";

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
}: EditorSidebarProps) {
  const [editingTableName, setEditingTableName] = useState<string | null>(null);
  const [tableName, setTableName] = useState("");
  const [currentTab, setCurrentTab] = useState("tables");

  const nodes = diagram.data.nodes || [];
  const edges = diagram.data.edges || [];

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

  const inspectingEdge = edges.find(e => e.id === activeItemId);

  return (
    <div className="h-full w-full flex flex-col bg-card">
      <Menubar className="rounded-none border-b">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onBackToGallery}>Back to Gallery</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onAddTable}>Add Table</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Export as SQL (coming soon)</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={onDeleteDiagram} className="text-destructive focus:text-destructive">
              Delete Diagram
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <div className="p-2">
        <h3 className="text-lg font-semibold tracking-tight px-2">{diagram.name}</h3>
        <p className="text-sm text-muted-foreground px-2">{diagram.dbType}</p>
      </div>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="flex-grow flex flex-col">
        <TabsList className="mx-4">
          <TabsTrigger value="tables">Tables ({nodes.length})</TabsTrigger>
          <TabsTrigger value="relationships">Relationships ({edges.length})</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-grow">
          <TabsContent value="tables" className="m-0">
            <Accordion type="single" collapsible value={activeItemId || undefined} onValueChange={onActiveItemIdChange} className="w-full px-4">
              {nodes.map((node) => (
                <AccordionItem value={node.id} key={node.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between items-center w-full pr-2">
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
                        <span className="truncate">{node.data.label}</span>
                      )}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(node)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNodeDelete(node.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <TableAccordionContent node={node} dbType={diagram.dbType} onNodeUpdate={onNodeUpdate} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
          <TabsContent value="relationships" className="m-0 p-4">
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
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}