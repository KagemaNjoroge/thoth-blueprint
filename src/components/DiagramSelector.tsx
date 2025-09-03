import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, ChevronsUpDown } from "lucide-react";

interface DiagramSelectorProps {
    selectedDiagramId: number | null;
    setSelectedDiagramId: (id: number | null) => void;
}

export default function DiagramSelector({ selectedDiagramId, setSelectedDiagramId }: DiagramSelectorProps) {
    const diagrams = useLiveQuery(() => db.diagrams.orderBy('name').toArray());
    const selectedDiagram = diagrams?.find(d => d.id === selectedDiagramId);

    const createNewDiagram = async () => {
        const name = prompt("Enter diagram name:", `New Diagram ${diagrams ? diagrams.length + 1 : 1}`);
        if (name) {
            const newDiagram = {
                name,
                data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const id = await db.diagrams.add(newDiagram);
            setSelectedDiagramId(id);
        }
    };

    return (
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
                <DropdownMenuItem onSelect={createNewDiagram}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Diagram
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}