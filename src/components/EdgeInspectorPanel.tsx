import { Edge, Node } from "reactflow";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

export const relationshipTypes = [
    { value: 'one-to-one', label: 'One-to-One' },
    { value: 'one-to-many', label: 'One-to-Many' },
    { value: 'many-to-one', label: 'Many-to-One' },
];

interface EdgeInspectorPanelProps {
    edge: Edge;
    nodes: Node[];
    onEdgeUpdate: (edge: Edge) => void;
    onEdgeDelete: (edgeId: string) => void;
}

export default function EdgeInspectorPanel({ edge, nodes, onEdgeUpdate, onEdgeDelete }: EdgeInspectorPanelProps) {
    if (!edge) return null;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    const sourceColumn = sourceNode?.data.columns.find((c: any) => c.id === edge.sourceHandle);
    const targetColumn = targetNode?.data.columns.find((c: any) => c.id === edge.targetHandle);

    const handleTypeChange = (value: string) => {
        const newEdge = { 
            ...edge, 
            data: { ...edge.data, relationship: value },
            label: relationshipTypes.find(t => t.value === value)?.label || '',
        };
        onEdgeUpdate(newEdge);
    };

    return (
        <div className="h-full w-full bg-card p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Relationship Inspector</h3>
            <Separator />
            <div className="my-4 space-y-2 text-sm">
                <p><strong>From:</strong> {sourceNode?.data.label}.{sourceColumn?.name}</p>
                <p><strong>To:</strong> {targetNode?.data.label}.{targetColumn?.name}</p>
            </div>
            <Separator />
            <div className="my-4">
                <Label>Relationship Type</Label>
                <Select value={edge.data?.relationship || 'one-to-many'} onValueChange={handleTypeChange}>
                    <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        {relationshipTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Separator />
            <div className="mt-6">
                 <Button variant="destructive" className="w-full" onClick={() => onEdgeDelete(edge.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Relationship
                </Button>
            </div>
        </div>
    );
}