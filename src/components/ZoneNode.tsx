import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { type AppZoneNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import { Lock, Plus, StickyNote, Trash2, Unlock } from "lucide-react";
import { useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "./ui/input";

export default function ZoneNode({ id, data, selected }: NodeProps<AppZoneNode>) {
  const [name, setName] = useState(data.name);
  const { screenToFlowPosition } = useReactFlow();
  const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(null);

  const debouncedUpdate = useDebouncedCallback((newName: string) => {
    if (data.onUpdate) {
      data.onUpdate(id, { name: newName });
    }
  }, 300);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    debouncedUpdate(event.target.value);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    contextMenuPositionRef.current = position;
  };

  const handleToggleLock = () => {
    if (data.onUpdate) {
      data.onUpdate(id, { isLocked: !data.isLocked });
    }
  };

  const { isLocked } = data;

  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={handleContextMenu}>
        <div
          className={cn(
            "w-full h-full rounded-lg border-2 bg-primary/5 group relative flex flex-col",
            selected ? "border-blue-500" : "border-primary/20",
            isLocked ? "border-solid border-primary/40" : "border-dashed"
          )}
        >
          <NodeResizer
            minWidth={150}
            minHeight={150}
            isVisible={selected && !isLocked}
            lineClassName="border-blue-400"
            handleClassName="h-3 w-3 bg-white border-2 rounded-full border-blue-400"
          />
          <div className="flex items-center p-1 flex-shrink-0">
            <Input
              value={name}
              onChange={handleChange}
              className="bg-transparent border-none text-foreground/80 font-semibold text-center focus-visible:ring-0 w-full"
              placeholder="Zone Name"
              disabled={isLocked || undefined}
            />
            {isLocked && <Lock className="h-3 w-3 text-foreground/50 ml-1 flex-shrink-0 absolute top-2 right-2" />}
          </div>
          <div className="flex-grow" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={handleToggleLock}
        >
          {isLocked ? (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Zone
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Lock Zone
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            if (data.onCreateTableAtPosition && contextMenuPositionRef.current) {
              data.onCreateTableAtPosition(contextMenuPositionRef.current);
            }
          }}
          disabled={isLocked || false}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Table
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            if (data.onCreateNoteAtPosition && contextMenuPositionRef.current) {
              data.onCreateNoteAtPosition(contextMenuPositionRef.current);
            }
          }}
          disabled={isLocked || false}
        >
          <StickyNote className="h-4 w-4 mr-2" />
          Add Note
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            if (data.onDelete) {
              data.onDelete([id]);
            }
          }}
          className="text-destructive focus:text-destructive"
          disabled={isLocked || false}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Zone
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}