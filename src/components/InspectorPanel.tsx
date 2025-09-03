import { useState } from "react";
import { Node } from "reactflow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2, Plus, Edit, Save, X } from "lucide-react";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface Column {
    name: string;
    type: string;
    pk?: boolean;
}

interface InspectorPanelProps {
    node: Node | null;
    onNodeUpdate: (node: Node) => void;
    onNodeDelete: (nodeId: string) => void;
}

export default function InspectorPanel({ node, onNodeUpdate, onNodeDelete }: InspectorPanelProps) {
    const [tableName, setTableName] = useState(node?.data.label || "");
    const [columns, setColumns] = useState<Column[]>(node?.data.columns || []);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);

    if (!node) return null;

    const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTableName(e.target.value);
    };

    const handleTableNameSave = () => {
        onNodeUpdate({ ...node, data: { ...node.data, label: tableName } });
    };

    const handleAddColumn = () => {
        const newColumn = { name: "new_column", type: "TEXT" };
        setColumns([...columns, newColumn]);
        setEditingColumn(newColumn);
        setEditingColumnIndex(columns.length);
    };

    const handleColumnChange = (key: keyof Column, value: any) => {
        if (editingColumn) {
            setEditingColumn({ ...editingColumn, [key]: value });
        }
    };

    const handleSaveColumn = () => {
        if (editingColumn && editingColumnIndex !== null) {
            const newColumns = [...columns];
            newColumns[editingColumnIndex] = editingColumn;
            setColumns(newColumns);
            onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
            setEditingColumn(null);
            setEditingColumnIndex(null);
        }
    };

    const handleDeleteColumn = (index: number) => {
        const newColumns = columns.filter((_, i) => i !== index);
        setColumns(newColumns);
        onNodeUpdate({ ...node, data: { ...node.data, columns: newColumns } });
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
                <div className="space-y-2">
                    {columns.map((col, index) => (
                        <div key={index} className="p-2 border rounded-md">
                            {editingColumnIndex === index ? (
                                <div className="space-y-2">
                                    <Input placeholder="Name" value={editingColumn?.name} onChange={(e) => handleColumnChange('name', e.target.value)} />
                                    <Input placeholder="Type" value={editingColumn?.type} onChange={(e) => handleColumnChange('type', e.target.value)} />
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={!!editingColumn?.pk} onChange={(e) => handleColumnChange('pk', e.target.checked)} />
                                        <label className="text-xs">Primary Key</label>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button size="icon" variant="ghost" onClick={() => { setEditingColumn(null); setEditingColumnIndex(null); }}><X className="h-4 w-4" /></Button>
                                        <Button size="icon" onClick={handleSaveColumn}><Save className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-mono">{col.name}</span>
                                        {col.pk && <Badge variant="secondary" className="ml-2">PK</Badge>}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-muted-foreground text-sm mr-4">{col.type}</span>
                                        <Button size="icon" variant="ghost" onClick={() => { setEditingColumn(col); setEditingColumnIndex(index); }}><Edit className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteColumn(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
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