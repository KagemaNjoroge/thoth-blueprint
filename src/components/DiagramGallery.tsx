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
import { PlusCircle, Database, Table, GitCommitHorizontal, Pencil, Trash2, Import } from "lucide-react";
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

interface DiagramGalleryProps {
  setSelectedDiagramId: (id: number) => void;
}

export default function DiagramGallery({ setSelectedDiagramId }: DiagramGalleryProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [diagramToEdit, setDiagramToEdit] = useState<Diagram | null>(null);
  const diagrams = useLiveQuery(() => db.diagrams.orderBy("updatedAt").reverse().toArray());

  const handleCreateDiagram = async ({ name, dbType }: { name: string; dbType: DatabaseType }) => {
    const newDiagram = {
      name,
      dbType,
      data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const id = await db.diagrams.add(newDiagram);
    setSelectedDiagramId(id);
  };

  const handleImportDiagram = async (diagramData: { name: string; dbType: DatabaseType; data: Diagram['data'] }) => {
    const newDiagram = {
      ...diagramData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const id = await db.diagrams.add(newDiagram);
    setSelectedDiagramId(id);
  };

  const handleRenameDiagram = async (id: number, name: string) => {
    await db.diagrams.update(id, { name, updatedAt: new Date() });
  };

  const handleDeleteDiagram = async (id: number) => {
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
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <AppIntro />
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Diagrams</h1>
          <div className="flex gap-2">
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

        {diagrams && diagrams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {diagrams.map((diagram) => (
              <div key={diagram.id} className="relative group">
                <Card
                  className="hover:shadow-lg hover:border-primary transition-all cursor-pointer flex flex-col h-full"
                  onClick={() => setSelectedDiagramId(diagram.id!)}
                >
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
                      <span>{diagram.data.nodes?.length || 0} Tables</span>
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
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the "{diagram.name}" diagram. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDiagram(diagram.id!)}>Delete</AlertDialogAction>
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