import { useState } from 'react';
import { Diagram } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileJson, Image as ImageIcon, Database, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToDbml, exportToSql, exportToJson } from '@/lib/dbml';
import { toSvg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { ReactFlowInstance, Node } from 'reactflow';
import { showError } from '@/utils/toast';

type ExportFormat = 'sql' | 'dbml' | 'json' | 'svg';

// Helper function based on React Flow v12's getRectOfNodes
function getRectOfNodes(nodes: Node[]) {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const rect = nodes.reduce(
    (acc, node) => {
      const nodeWidth = node.width || 0;
      const nodeHeight = node.height || 0;

      return {
        minX: Math.min(acc.minX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxX: Math.max(acc.maxX, node.position.x + nodeWidth),
        maxY: Math.max(acc.maxY, node.position.y + nodeHeight),
      };
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  );

  return {
    x: rect.minX,
    y: rect.minY,
    width: rect.maxX - rect.minX,
    height: rect.maxY - rect.minY,
  };
}

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  diagram: Diagram | null | undefined;
  rfInstance: ReactFlowInstance | null;
}

export function ExportDialog({ isOpen, onOpenChange, diagram, rfInstance }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);

  const handleExport = async () => {
    if (!diagram || !selectedFormat) return;

    const filename = `${diagram.name.replace(/\s+/g, '_')}.${selectedFormat === 'sql' ? 'sql' : selectedFormat}`;
    let data: string | Blob = '';

    try {
        switch (selectedFormat) {
            case 'sql':
                data = exportToSql(diagram);
                break;
            case 'dbml':
                data = exportToDbml(diagram);
                break;
            case 'json':
                data = exportToJson(diagram);
                break;
            case 'svg':
                if (rfInstance) {
                    const PADDING = 40;
                    const nodes = rfInstance.getNodes();
                    if (nodes.length === 0) {
                        showError("Cannot export an empty diagram.");
                        return;
                    }
                    const nodesBounds = getRectOfNodes(nodes);
                    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
                    if (!viewport) throw new Error("React Flow viewport not found.");
                    
                    const dataUrl = await toSvg(viewport, {
                        width: nodesBounds.width + PADDING * 2,
                        height: nodesBounds.height + PADDING * 2,
                        style: {
                            width: `${nodesBounds.width}px`,
                            height: `${nodesBounds.height}px`,
                            transform: `translate(${-nodesBounds.x + PADDING}px, ${-nodesBounds.y + PADDING}px)`,
                        },
                        backgroundColor: 'white',
                    });
                    const blob = await (await fetch(dataUrl)).blob();
                    saveAs(blob, `${diagram.name.replace(/\s+/g, '_')}.svg`);
                }
                onOpenChange(false);
                setSelectedFormat(null);
                return;
        }
        const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, filename);
    } catch (error) {
        console.error("Export failed:", error);
        showError(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        onOpenChange(false);
        setSelectedFormat(null);
    }
  };

  const dbTypeDisplay = diagram?.dbType === 'mysql' ? 'MySQL' : 'PostgreSQL';

  const options = [
    { id: 'sql', title: dbTypeDisplay, icon: Database, description: `Export schema as ${dbTypeDisplay} DDL.` },
    { id: 'dbml', title: 'DBML', icon: FileText, description: 'Export a DBML representation.' },
    { id: 'json', title: 'JSON', icon: FileJson, description: 'Export a JSON representation.' },
    { id: 'svg', title: 'SVG', icon: ImageIcon, description: 'Export diagram as a .svg image.' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Diagram</DialogTitle>
          <DialogDescription>Select a format to export your diagram.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">General</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {options.map(opt => (
                    <Card
                        key={opt.id}
                        onClick={() => setSelectedFormat(opt.id as ExportFormat)}
                        className={cn(
                            "cursor-pointer transition-all",
                            selectedFormat === opt.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                        )}
                    >
                        <CardHeader className="items-center p-4">
                            <opt.icon className="h-8 w-8 mb-2" />
                            <CardTitle className="text-base text-center">{opt.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-xs text-muted-foreground p-4 pt-0">
                            {opt.description}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
        <div className="flex justify-end">
            <Button onClick={handleExport} disabled={!selectedFormat}>
                Export
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}