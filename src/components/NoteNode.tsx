import { type NodeProps } from "@xyflow/react";
import { type NoteNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Trash2 } from "lucide-react";

type NoteNodeComponentData = NoteNodeData & {
  onUpdate: (id: string, data: Partial<NoteNodeData>) => void;
  onDelete: (ids: string[]) => void;
};

export default function NoteNode({ id, data, selected }: NodeProps<NoteNodeComponentData>) {
  const [text, setText] = useState(data.text);

  const debouncedUpdate = useDebouncedCallback((newText: string) => {
    data.onUpdate(id, { text: newText });
  }, 300);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    debouncedUpdate(event.target.value);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "w-48 h-48 p-3 shadow-md rounded-md font-sans text-sm bg-yellow-200 text-yellow-900 border-2 border-transparent transition-colors",
            "dark:bg-yellow-800 dark:text-yellow-100",
            selected && "border-blue-500 dark:border-blue-400"
          )}
          style={{
            transform: "rotate(-2deg)",
          }}
        >
          <textarea
            value={text}
            onChange={handleChange}
            className="w-full h-full bg-transparent border-none outline-none p-0 m-0"
            placeholder="Type your note..."
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => data.onDelete([id])} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Note
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}