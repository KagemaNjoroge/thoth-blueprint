import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Key } from 'lucide-react';

interface Column {
    name: string;
    type: string;
    pk?: boolean;
    nullable?: boolean;
}

interface TableNodeData {
    label: string;
    columns: Column[];
}

function TableNode({ data }: NodeProps<TableNodeData>) {
  return (
    <Card className="w-64 shadow-md">
      <CardHeader className="bg-primary text-primary-foreground p-2 rounded-t-lg cursor-move">
        <CardTitle className="text-sm text-center font-semibold">{data.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.columns?.map((col, index) => (
          <div key={index} className="flex justify-between items-center text-xs py-1 px-2 border-b last:border-b-0">
            <div className="flex items-center gap-1">
                {col.pk && <Key className="h-3 w-3 text-yellow-500" />}
                <span>{col.name}</span>
            </div>
            <span className={`text-muted-foreground ${col.nullable === false ? 'font-bold text-foreground/80' : ''}`}>{col.type}</span>
          </div>
        ))}
      </CardContent>
      <Handle type="source" position={Position.Top} className="!w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
      <Handle type="source" position={Position.Left} className="!w-3 !h-3" />
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <Handle type="target" position={Position.Right} className="!w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} className="!w-3 !h-3" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3" />
    </Card>
  );
}

export default TableNode;