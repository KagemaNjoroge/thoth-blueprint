import { type NodeProps, NodeResizer } from "@xyflow/react";
import { type AppZoneNode } from "@/lib/types";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Trash2 } from "lucide-react";

export default function ZoneNode({ id, data, selected }: NodeProps<AppZoneNode>) {
  const [name, setName] = useState(data.name);

  const debouncedUpdate = useDebouncedCallback((newName: string) => {
    if (data.onUpdate) {
      data.onUpdate(id, { name: newName });
    }
  }, 300);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    debouncedUpdate(event.target.value);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "w-full h-full rounded-lg border-2 border-dashed bg-primary/5 group",
            selected ? "border-blue-500" : "border-primary/20"
          )}
        >
          <NodeResizer
            minWidth={150}
            minHeight={150}
            isVisible={selected}
            lineClassName="border-blue-400"
            handleClassName="h-3 w-3 bg-white border-2 rounded-full border-blue-400"
          />
          <Input
            value={name}
            onChange={handleChange}
            className="bg-transparent border-none text-foreground/80 font-semibold text-center focus-visible:ring-0 w-full"
            placeholder="Zone Name"
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            if (data.onDelete) {
              data.onDelete([id]);
            }
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Zone
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}