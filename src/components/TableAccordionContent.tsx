import { useState, useEffect } from "react";
import { Node } from "reactflow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2, Plus, Key, MoreHorizontal, HelpCircle, GripVertical, Check, X } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "./ui/command";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

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
    enumValues?: string;
}

interface Index {
    id: string;
    name: string;
    columns: string[]; // array of column IDs
    isUnique?: boolean;
}

interface TableAccordionContentProps {
    node: Node;
    dbType: DatabaseType;
    onNodeUpdate: (node: Node) => void;
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
                    {col.type.toUpperCase() === 'ENUM' && (
                        <div className="space-y-1">
                            <Label htmlFor={`enum-${index}`}>ENUM Values</Label>
                            <Input 
                                id={`enum-${index}`} 
                                placeholder="Use , for batch input" 
                                value={col.enumValues || ''} 
                                onChange={(e) => handleColumnUpdate(index, 'enumValues', e.target.value)} 
                            />
                        </div>
                    )}
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

export default function TableAccordionContent({ node, dbType, onNodeUpdate }: TableAccordionContentProps) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [indices, setIndices] = useState<Index[]>([]);
    const [tableComment, setTableComment] = useState("");
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

    const availableTypes = dataTypes[dbType] || [];
    const sensors = useSensors(useSensor(PointerSensor));

    useEffect(() => {
        if (node) {
            const columnsWithIds = (node.data.columns || []).map((col: any) => ({
                ...col,
                id: col.id || `col_${Math.random().toString(36).substring(2, 11)}`
            }));
            setColumns(columnsWithIds);
            const indicesWithIds = (node.data.indices || []).map((idx: any) => ({
                ...idx,
                id: idx.id || `idx_${Math.random().toString(36).substring(2, 11)}`
            }));
            setIndices(indicesWithIds);
            setTableComment(node.data.comment || "");
        }
    }, [node]);

    if (!node) return null;

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
        if (over && active.id !== over.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newColumns = arrayMove(items, oldIndex, newIndex);
                onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
                return newColumns;
            });
        }
    };

    const handleAddIndex = () => {
        const newIndex: Index = {
            id: `idx_${Date.now()}`,
            name: `${node.data.label}_index_${indices.length}`,
            columns: [],
            isUnique: false,
        };
        const newIndices = [...indices, newIndex];
        setIndices(newIndices);
        onNodeUpdate({ ...node, data: { ...node.data, indices: newIndices } });
        
        setOpenAccordionItems(prev => prev.includes('indices') ? prev : [...prev, 'indices']);
    };

    const handleIndexUpdate = (indexId: string, updatedFields: Partial<Index>) => {
        const newIndices = indices.map(idx =>
            idx.id === indexId ? { ...idx, ...updatedFields } : idx
        );
        setIndices(newIndices);
        onNodeUpdate({ ...node, data: { ...node.data, indices: newIndices } });
    };

    const handleDeleteIndex = (indexId: string) => {
        const newIndices = indices.filter(idx => idx.id !== indexId);
        setIndices(newIndices);
        onNodeUpdate({ ...node, data: { ...node.data, indices: newIndices } });
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTableComment(e.target.value);
    };

    const handleCommentSave = () => {
        onNodeUpdate({ ...node, data: { ...node.data, comment: tableComment } });
    };

    return (
        <div className="space-y-4 px-1">
            <div>
                <h4 className="font-semibold mb-2">Columns</h4>
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
                <div className="mt-4 flex gap-2">
                    <Button className="flex-grow" onClick={handleAddColumn}>
                        <Plus className="h-4 w-4 mr-2" /> Add Column
                    </Button>
                    <Button className="flex-grow" variant="outline" onClick={handleAddIndex}>
                        <Plus className="h-4 w-4 mr-2" /> Add Index
                    </Button>
                </div>
            </div>
            <Separator />
            <Accordion type="multiple" className="w-full" value={openAccordionItems} onValueChange={setOpenAccordionItems}>
                <AccordionItem value="indices">
                    <AccordionTrigger>Indices</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                        {indices.map(idx => (
                            <div key={idx.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="flex-grow h-auto min-h-10 justify-start">
                                            {idx.columns.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                    {idx.columns.map(colId => {
                                                        const col = columns.find(c => c.id === colId);
                                                        return (
                                                            <Badge key={colId} variant="secondary" className="flex items-center gap-1">
                                                                {col?.name}
                                                                <button onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newCols = idx.columns.filter(c => c !== colId);
                                                                    handleIndexUpdate(idx.id, { columns: newCols });
                                                                }}>
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            ) : <span className="text-muted-foreground text-sm">Select columns...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-48">
                                        <Command>
                                            <CommandInput placeholder="Search columns..." />
                                            <CommandEmpty>No columns found.</CommandEmpty>
                                            <CommandGroup>
                                                {columns.map(col => (
                                                    <CommandItem
                                                        key={col.id}
                                                        onSelect={() => {
                                                            const newCols = idx.columns.includes(col.id)
                                                                ? idx.columns.filter(c => c !== col.id)
                                                                : [...idx.columns, col.id];
                                                            handleIndexUpdate(idx.id, { columns: newCols });
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", idx.columns.includes(col.id) ? "opacity-100" : "opacity-0")} />
                                                        {col.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-64 p-2 space-y-4">
                                        <div className="space-y-1">
                                            <Label htmlFor={`index-name-${idx.id}`}>Name</Label>
                                            <Input id={`index-name-${idx.id}`} value={idx.name} onChange={(e) => handleIndexUpdate(idx.id, { name: e.target.value })} />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id={`index-unique-${idx.id}`} checked={!!idx.isUnique} onCheckedChange={(checked) => handleIndexUpdate(idx.id, { isUnique: !!checked })} />
                                            <Label htmlFor={`index-unique-${idx.id}`}>Unique</Label>
                                        </div>
                                        <Separator />
                                        <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteIndex(idx.id)}>
                                            Delete Index
                                        </Button>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ))}
                        {indices.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No indices defined.</p>}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="comment">
                    <AccordionTrigger>Comment</AccordionTrigger>
                    <AccordionContent>
                        <Textarea placeholder="Table comment..." value={tableComment} onChange={handleCommentChange} onBlur={handleCommentSave} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}