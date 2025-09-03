import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface DiagramListProps {
    selectedDiagramId: number | null;
    setSelectedDiagramId: (id: number | null) => void;
}

export default function DiagramList({ selectedDiagramId, setSelectedDiagramId }: DiagramListProps) {
    const diagrams = useLiveQuery(() => db.diagrams.orderBy('name').toArray());

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
        <div className="flex flex-col h-full w-full p-2">
            <div className="flex justify-between items-center p-2 border-b mb-2">
                <h2 className="text-lg font-semibold">Diagrams</h2>
                <Button variant="ghost" size="sm" onClick={createNewDiagram}>
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto">
                <ul>
                    {diagrams?.map((diagram) => (
                        <li key={diagram.id}>
                            <Button
                                variant={selectedDiagramId === diagram.id ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setSelectedDiagramId(diagram.id!)}
                            >
                                {diagram.name}
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}