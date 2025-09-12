import { type NodeProps, NodeResizer } from "@xyflow/react";
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
            "w-full h-full p-3 shadow-md rounded-md font-sans text-sm bg-yellow-200 text-yellow-900 border-2 border-transparent transition-colors",
            selected && "border-blue-500"
          )}
          style={{
            transform: "rotate(-2deg)",
          }}
        >
          <NodeResizer
            minWidth={120}
            minHeight={120}
            isVisible={selected}
            lineClassName="border-blue-400"
            handleClassName="h-3 w-3 bg-white border-2 rounded-full border-blue-400"
          />
          <textarea
            value={text}
            onChange={handleChange}
            className="w-full h-full bg-transparent border-none outline-none p-0 m-0 resize-none no-scrollbar break-words"
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