import { useState, useEffect } from "react";
import { Node } from "reactflow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2, Plus, Key, MoreHorizontal, HelpCircle, GripVertical } from "lucide-react";
import { Separator } from "./ui/separator";
import { DatabaseType } from "@/lib/db";
import { dataTypes } from "@/lib/db-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Column {
    id: string;
    name: string;
    type: string;
    pk?: boolean;
    nullable?: boolean;
    defaultValue?: string;
    isUnique?: boolean;
    isAutoIncrement?: boolean;
    isUnsigned?: boolean;
    comment?: string;
}

interface InspectorPanelProps {
    node: Node | null;
    dbType: DatabaseType;
    onNodeUpdate: (node: Node) => void;
    onNodeDelete: (nodeId: string) => void;
}

function SortableColumnItem({ col, index, availableTypes, handleColumnUpdate, handleDeleteColumn }: { col: Column, index: number, availableTypes: string[], handleColumnUpdate: (index: number, field: keyof Column, value: any) => void, handleDeleteColumn: (index: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-1 p-1 border rounded-md bg-background">
            <div {...attributes} {...listeners} className="cursor-grab p-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input 
                value={col.name} 
                onChange={(e) => handleColumnUpdate(index, 'name', e.target.value)}
                className="h-8 flex-grow"
            />
            <Select value={col.type} onValueChange={(value) => handleColumnUpdate(index, 'type', value)}>
                <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {availableTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => handleColumnUpdate(index, 'nullable', !col.nullable)}>
                <HelpCircle className={`h-4 w-4 ${col.nullable ? 'text-blue-500' : 'text-muted-foreground'}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => handleColumnUpdate(index, 'pk', !col.pk)}>
                <Key className={`h-4 w-4 ${col.pk ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                        <Label htmlFor={`default-${index}`}>Default Value</Label>
                        <Input id={`default-${index}`} placeholder="NULL" value={col.defaultValue || ''} onChange={(e) => handleColumnUpdate(index, 'defaultValue', e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id={`unique-${index}`} checked={!!col.isUnique} onCheckedChange={(checked) => handleColumnUpdate(index, 'isUnique', !!checked)} />
                        <Label htmlFor={`unique-${index}`}>Unique</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id={`autoincrement-${index}`} checked={!!col.isAutoIncrement} onCheckedChange={(checked) => handleColumnUpdate(index, 'isAutoIncrement', !!checked)} />
                        <Label htmlFor={`autoincrement-${index}`}>Autoincrement</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id={`unsigned-${index}`} checked={!!col.isUnsigned} onCheckedChange={(checked) => handleColumnUpdate(index, 'isUnsigned', !!checked)} />
                        <Label htmlFor={`unsigned-${index}`}>Unsigned</Label>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`comment-${index}`}>Comment</Label>
                        <Textarea id={`comment-${index}`} placeholder="Column comment..." value={col.comment || ''} onChange={(e) => handleColumnUpdate(index, 'comment', e.target.value)} />
                    </div>
                    <Separator />
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteColumn(index)}>
                        Delete Column
                    </Button>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export default function InspectorPanel({ node, dbType, onNodeUpdate, onNodeDelete }: InspectorPanelProps) {
    const [tableName, setTableName] = useState(node?.data.label || "");
    const [columns, setColumns] = useState<Column[]>(node?.data.columns || []);

    const availableTypes = dataTypes[dbType] || [];
    const sensors = useSensors(useSensor(PointerSensor));

    useEffect(() => {
        if (node) {
            setTableName(node.data.label || "");
            setColumns(node.data.columns || []);
        }
    }, [node]);

    if (!node) return null;

    const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTableName(e.target.value);
    };

    const handleTableNameSave = () => {
        onNodeUpdate({ ...node, data: { ...node.data, label: tableName } });
    };

    const handleAddColumn = () => {
        const newColumn: Column = { 
            id: `col_${Date.now()}`,
            name: `new_column_${columns.length + 1}`, 
            type: availableTypes[0] || "TEXT",
            nullable: true,
        };
        const newColumns = [...columns, newColumn];
        setColumns(newColumns);
        onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
    };

    const handleDeleteColumn = (index: number) => {
        const newColumns = columns.filter((_, i) => i !== index);
        setColumns(newColumns);
        onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
    };

    const handleColumnUpdate = (index: number, field: keyof Column, value: any) => {
        const newColumns = [...columns];
        
        if (field === 'pk' && value === true) {
            newColumns.forEach((c, i) => {
                if (i !== index) c.pk = false;
            });
        }

        newColumns[index] = {
            ...newColumns[index],
            [field]: value,
        };

        setColumns(newColumns);
        onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over!.id);
                const newColumns = arrayMove(items, oldIndex, newIndex);
                onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
                return newColumns;
            });
        }
    };

    return (
        <div className="h-full w-full bg-card p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Inspector</h3>
            <Separator />
            <div className="my-4">
                <label className="text-sm font-medium">Table Name</label>
                <div className="flex items-center gap-2 mt-1">
                    <Input value={tableName} onChange={handleTableNameChange} onBlur={handleTableNameSave} />
                </div>
            </div>
            <Separator />
            <div className="my-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Columns</h4>
                    <Button size="sm" variant="ghost" onClick={handleAddColumn}><Plus className="h-4 w-4 mr-2" /> Add</Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {columns.map((col, index) => (
                                <SortableColumnItem 
                                    key={col.id} 
                                    col={col} 
                                    index={index} 
                                    availableTypes={availableTypes} 
                                    handleColumnUpdate={handleColumnUpdate} 
                                    handleDeleteColumn={handleDeleteColumn} 
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
            <Separator />
            <div className="mt-6">
                 <Button variant="destructive" className="w-full" onClick={() => onNodeDelete(node.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Table
                </Button>
            </div>
        </div>
    );
}