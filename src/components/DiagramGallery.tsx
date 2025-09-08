import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Diagram, DatabaseType } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Database, Table, GitCommitHorizontal, Pencil, Trash2, Import, RotateCcw } from "lucide-react";
import { CreateDiagramDialog } from "./CreateDiagramDialog";
import { RenameDiagramDialog } from "./RenameDiagramDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { AppIntro } from "./AppIntro";
import { ImportDialog } from "./ImportDialog";
import { ThemeToggle } from "./theme-toggle";
import { Features } from "./Features";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DiagramGalleryProps {
  setSelectedDiagramId: (id: number) => void;
}

export default function DiagramGallery({ setSelectedDiagramId }: DiagramGalleryProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [diagramToEdit, setDiagramToEdit] = useState<Diagram | null>(null);
  const diagrams = useLiveQuery(() => db.diagrams.orderBy("updatedAt").reverse().toArray());

  const activeDiagrams = diagrams?.filter(d => !d.deletedAt);
  const trashedDiagrams = diagrams?.filter(d => d.deletedAt);

  const handleCreateDiagram = async ({ name, dbType }: { name: string; dbType: DatabaseType }) => {
    const newDiagram: Diagram = {
      name,
      dbType,
      data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const id = await db.diagrams.add(newDiagram);
    setSelectedDiagramId(id);
  };

  const handleImportDiagram = async (diagramData: { name: string; dbType: DatabaseType; data: Diagram['data'] }) => {
    const newDiagram: Diagram = {
      ...diagramData,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const id = await db.diagrams.add(newDiagram);
    setSelectedDiagramId(id);
  };

  const handleRenameDiagram = async (id: number, name: string) => {
    await db.diagrams.update(id, { name, updatedAt: new Date() });
  };

  const handleDeleteDiagram = async (id: number) => {
    await db.diagrams.update(id, { deletedAt: new Date(), updatedAt: new Date() });
  };

  const handleRestoreDiagram = async (id: number) => {
    await db.diagrams.update(id, { deletedAt: null, updatedAt: new Date() });
  };

  const handlePermanentlyDeleteDiagram = async (id: number) => {
    await db.diagrams.delete(id);
  };

  const openRenameDialog = (diagram: Diagram) => {
    setDiagramToEdit(diagram);
    setIsRenameDialogOpen(true);
  };

  const dbTypeDisplay: Record<DatabaseType, string> = {
    postgres: "PostgreSQL",
    mysql: "MySQL",
  };

  return (
    <div className="p-8 h-full w-full bg-background overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <AppIntro />

        <div className="my-8">
          <Features />
        </div>

        <div className="flex justify-between items-center mb-8 mt-12">
          <h1 className="text-3xl font-bold tracking-tight">My Diagrams</h1>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Import className="h-4 w-4 mr-2" />
              Import Diagram
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Diagram
            </Button>
          </div>
        </div>

        <Tabs defaultValue="diagrams" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
            <TabsTrigger value="trash">Trash</TabsTrigger>
          </TabsList>
          <TabsContent value="diagrams" className="mt-6">
            {activeDiagrams && activeDiagrams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeDiagrams.map((diagram) => (
                  <div key={diagram.id} className="relative group">
                    <Card
                      className="hover:shadow-lg hover:border-primary transition-all cursor-pointer flex flex-col h-full overflow-hidden"
                      onClick={() => setSelectedDiagramId(diagram.id!)}
                    >
                      <div style={{ backgroundColor: diagram.data.nodes?.[0]?.data.color || '#a1a1aa' }} className="h-2 w-full" />
                      <CardHeader>
                        <CardTitle className="truncate">{diagram.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 pt-1">
                          <Database className="h-4 w-4" />
                          {dbTypeDisplay[diagram.dbType]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4" />
                          <span>{diagram.data.nodes?.filter(n => !n.data.isDeleted).length || 0} Tables</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GitCommitHorizontal className="h-4 w-4" />
                          <span>{diagram.data.edges?.length || 0} Relationships</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDistanceToNow(diagram.updatedAt, { addSuffix: true })}
                        </p>
                      </CardFooter>
                    </Card>
                    <div className="absolute top-4 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openRenameDialog(diagram)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will move the "{diagram.name}" diagram to the trash. You can restore it later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDiagram(diagram.id!)}>Move to Trash</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">No diagrams yet</h2>
                <p className="text-muted-foreground mt-2 mb-4">
                  Click "Create New Diagram" to get started.
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="trash" className="mt-6">
            {trashedDiagrams && trashedDiagrams.length > 0 ? (
              <Card>
                <UiTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trashedDiagrams.map((diagram) => (
                      <TableRow key={diagram.id}>
                        <TableCell className="font-medium">{diagram.name}</TableCell>
                        <TableCell>{formatDistanceToNow(diagram.deletedAt!, { addSuffix: true })}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleRestoreDiagram(diagram.id!)}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Restore
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the "{diagram.name}" diagram and all of its data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handlePermanentlyDeleteDiagram(diagram.id!)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UiTable>
              </Card>
            ) : (
              <div className="text-center py-24 border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-semibold">Trash is empty</h2>
                <p className="text-muted-foreground mt-2">Deleted diagrams will appear here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateDiagramDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateDiagram={handleCreateDiagram}
      />
      <ImportDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportDiagram={handleImportDiagram}
      />
      <RenameDiagramDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onRenameDiagram={handleRenameDiagram}
        diagram={diagramToEdit}
      />
    </div>
  );
}