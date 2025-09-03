import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Key } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

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

interface TableNodeData {
    label: string;
    columns: Column[];
}

function TableNode({ data }: NodeProps<TableNodeData>) {
  return (
    <Card className="w-64 shadow-md react-flow__node-default">
      <CardHeader className="bg-primary text-primary-foreground p-2 rounded-t-lg cursor-move">
        <CardTitle className="text-sm text-center font-semibold">{data.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.columns?.map((col) => (
          <TooltipProvider key={col.id} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex justify-between items-center text-xs py-1 px-2 border-b last:border-b-0">
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={col.id}
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                    className="!w-3 !h-3"
                  />
                  <div className="flex items-center gap-1">
                      {col.pk && <Key className="h-3 w-3 text-yellow-500" />}
                      <span>{col.name}</span>
                  </div>
                  <span className={`text-muted-foreground ${col.nullable === false ? 'font-bold text-foreground/80' : ''}`}>{col.type}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={col.id}
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                    className="!w-3 !h-3"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="start">
                <div className="p-2 max-w-xs text-sm">
                    <div className="flex justify-between items-center font-bold mb-2">
                        <span>{col.name}</span>
                        <span className="text-primary">{col.type}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {col.pk && <Badge variant="outline">Primary</Badge>}
                        {col.isUnique && <Badge variant="outline">Unique</Badge>}
                        {col.nullable === false && <Badge variant="outline">Not Null</Badge>}
                        {col.isAutoIncrement && <Badge variant="outline">Autoincrement</Badge>}
                        {col.isUnsigned && <Badge variant="outline">Unsigned</Badge>}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                        <p><span className="font-semibold text-foreground">Default:</span> {col.defaultValue || 'Not set'}</p>
                        <p><span className="font-semibold text-foreground">Comment:</span> {col.comment || 'Not set'}</p>
                    </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </CardContent>
    </Card>
  );
}

export default TableNode;