import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

interface WhatsNewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  markdown?: string;
  onReload?: () => void;
}

export function WhatsNewDialog({ isOpen, onOpenChange, markdown = "", onReload }: WhatsNewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[calc(100vw-2rem)] sm:w-full
          sm:max-w-2xl md:max-w-3xl lg:max-w-4xl
          max-h-[calc(100vh-6rem)]
        "
      >
        <DialogHeader>
          <DialogTitle>What’s New</DialogTitle>
          <DialogDescription>
            Highlights and fixes included in this update.
          </DialogDescription>
        </DialogHeader>
        {/* Scrollable content area for long release notes */}
        <div
          className="
            overflow-y-auto no-scrollbar
            max-h-[calc(100vh-15rem)]
            prose dark:prose-invert max-w-none
            pr-2
          "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>
        <DialogFooter>
          {onReload ? (
            <Button onClick={onReload} className="w-full">Reload Now</Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}