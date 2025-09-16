import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from "@/lib/db";
import { type DatabaseType } from "@/lib/types";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronsUpDown, PlusCircle } from "lucide-react";
import { useState } from "react";
import { CreateDiagramDialog } from "./CreateDiagramDialog";

interface DiagramSelectorProps {
    selectedDiagramId: number | null;
    setSelectedDiagramId: (id: number | null) => void;
}

export default function DiagramSelector({ selectedDiagramId, setSelectedDiagramId }: DiagramSelectorProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const diagrams = useLiveQuery(() => db.diagrams.orderBy('name').toArray());
    const selectedDiagram = diagrams?.find(d => d.id === selectedDiagramId);

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

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-56 justify-between">
                        <span>{selectedDiagram?.name || "Select a Diagram"}</span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>My Diagrams</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {diagrams?.map((diagram) => (
                        <DropdownMenuItem key={diagram.id} onSelect={() => setSelectedDiagramId(diagram.id!)}>
                            {diagram.name}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsCreateDialogOpen(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create New Diagram
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <CreateDiagramDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onCreateDiagram={handleCreateDiagram}
            />
        </>
    );
}