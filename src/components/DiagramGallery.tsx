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
import { PlusCircle, Database, Table, GitCommitHorizontal } from "lucide-react";
import { CreateDiagramDialog } from "./CreateDiagramDialog";
import { formatDistanceToNow } from "date-fns";

interface DiagramGalleryProps {
  setSelectedDiagramId: (id: number) => void;
}

export default function DiagramGallery({ setSelectedDiagramId }: DiagramGalleryProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

  const dbTypeDisplay: Record<DatabaseType, string> = {
    postgres: "PostgreSQL",
    mysql: "MySQL",
  };

  return (
    <div className="p-8 h-full w-full bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Diagrams</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Diagram
        </Button>
      </div>

      {diagrams && diagrams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {diagrams.map((diagram) => (
            <Card
              key={diagram.id}
              className="hover:shadow-lg hover:border-primary transition-all cursor-pointer flex flex-col"
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

      <CreateDiagramDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateDiagram={handleCreateDiagram}
      />
    </div>
  );
}