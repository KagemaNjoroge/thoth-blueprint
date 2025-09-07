import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
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
import { useState, useEffect } from "react";
import { type AppEdge, type AppNode } from "@/lib/types";

export const relationshipTypes = [
    { value: 'one-to-one', label: 'One-to-One' },
    { value: 'one-to-many', label: 'One-to-Many' },
    { value: 'many-to-one', label: 'Many-to-One' },
    { value: 'many-to-many', label: 'Many-to-Many' },
];

interface EdgeInspectorPanelProps {
    edge: AppEdge;
    nodes: AppNode[];
    onEdgeUpdate: (edge: AppEdge) => void;
    onEdgeDelete: (edgeId: string) => void;
    isLocked: boolean;
}

export default function EdgeInspectorPanel({ edge, nodes, onEdgeUpdate, onEdgeDelete, isLocked }: EdgeInspectorPanelProps) {
    const [relationshipType, setRelationshipType] = useState(edge.data?.relationship || 'one-to-many');

    useEffect(() => {
        if (edge) {
            setRelationshipType(edge.data?.relationship || 'one-to-many');
        }
    }, [edge]);

    if (!edge) return null;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    const sourceColumn = sourceNode?.data.columns.find((c) => c.id === edge.sourceHandle);
    const targetColumn = targetNode?.data.columns.find((c) => c.id === edge.targetHandle);

    const handleTypeChange = (value: string) => {
        setRelationshipType(value);
        const newEdge: AppEdge = { 
            ...edge, 
            data: { ...edge.data, relationship: value },
        };
        onEdgeUpdate(newEdge);
    };

    return (
        <div className="h-full w-full">
            <h3 className="text-lg font-semibold mb-4">Relationship Details</h3>
            <Separator />
            <div className="my-4 space-y-2 text-sm">
                <p><strong>From:</strong> {sourceNode?.data.label}.{sourceColumn?.name}</p>
                <p><strong>To:</strong> {targetNode?.data.label}.{targetColumn?.name}</p>
            </div>
            <Separator />
            <div className="my-4">
                <Label>Relationship Type</Label>
                <Select value={relationshipType} onValueChange={handleTypeChange} disabled={isLocked}>
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
                <AlertDialog>
                    <AlertDialogTrigger asChild disabled={isLocked}>
                        <Button variant="destructive" className="w-full" disabled={isLocked}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Relationship
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the relationship between "{sourceNode?.data.label}.{sourceColumn?.name}" and "{targetNode?.data.label}.{targetColumn?.name}". This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onEdgeDelete(edge.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}