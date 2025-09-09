import { useState } from "react";
import { Diagram } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Image as ImageIcon, Database, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToDbml, exportToSql, exportToJson } from "@/lib/dbml";
import { exportToMermaid } from "@/lib/mermaid";
import { generateLaravelMigration } from "@/lib/codegen/laravel/migration-generator";
import { generateTypeOrmMigration } from "@/lib/codegen/typeorm/migration-generator";
import JSZip from "jszip";
import { LaravelIcon } from "@/components/icons/LaravelIcon";
import { TypeOrmIcon } from "@/components/icons/TypeOrmIcon";
import { toSvg } from "html-to-image";
import { saveAs } from "file-saver";
import {
  ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { showError } from "@/utils/toast";

type ExportFormat = "sql" | "dbml" | "json" | "svg" | "mermaid" | "laravel" | "typeorm";

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  diagram: Diagram | null | undefined;
  rfInstance: ReactFlowInstance | null;
}

export function ExportDialog({
  isOpen,
  onOpenChange,
  diagram,
  rfInstance,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(
    null
  );

  const handleExport = async () => {
    if (!diagram || !selectedFormat) return;

    const filename = `${diagram.name.replace(/\s+/g, "_")}.${
      selectedFormat === "sql"
        ? "sql"
        : selectedFormat === "mermaid"
        ? "mmd"
        : selectedFormat
    }`;
    let data: string | Blob = "";

    try {
      switch (selectedFormat) {
        case "sql":
          data = exportToSql(diagram);
          break;
        case "dbml":
          data = exportToDbml(diagram);
          break;
        case "json":
          data = exportToJson(diagram);
          break;
        case "mermaid":
          data = exportToMermaid(diagram);
          break;
        case "laravel": { // Generate Laravel migration files and create a zip
          const migrationFiles = generateLaravelMigration(diagram);
          if (migrationFiles.length === 0) {
            showError("No tables found to generate migrations.");
            return;
          }

          const zip = new JSZip();
          migrationFiles.forEach((file) => {
            zip.file(file.filename, file.content);
          });

          const zipBlob = await zip.generateAsync({ type: "blob" });
          saveAs(
            zipBlob,
            `${diagram.name.replace(/\s+/g, "_")}_laravel_migrations.zip`
          );
          onOpenChange(false);
          setSelectedFormat(null);
          return;
        }
        case "typeorm": { // Generate TypeORM migration files and create a zip
          const migrationFiles = generateTypeOrmMigration(diagram);
          if (migrationFiles.length === 0) {
            showError("No tables found to generate migrations.");
            return;
          }

          const zip = new JSZip();
          migrationFiles.forEach((file) => {
            zip.file(file.filename, file.content);
          });

          const zipBlob = await zip.generateAsync({ type: "blob" });
          saveAs(
            zipBlob,
            `${diagram.name.replace(/\s+/g, "_")}_typeorm_migrations.zip`
          );
          onOpenChange(false);
          setSelectedFormat(null);
          return;
        }
        case "svg":
          if (rfInstance) {
            const PADDING = 40;
            const nodes = rfInstance.getNodes();
            if (nodes.length === 0) {
              showError("Cannot export an empty diagram.");
              return;
            }
            const nodesBounds = getNodesBounds(nodes);
            const imageWidth = nodesBounds.width + PADDING * 2;
            const imageHeight = nodesBounds.height + PADDING * 2;

            const viewport = getViewportForBounds(
              nodesBounds,
              imageWidth,
              imageHeight,
              0.5,
              2,
              PADDING
            );

            const viewportEl = document.querySelector(
              ".react-flow__viewport"
            ) as HTMLElement;
            if (!viewportEl) throw new Error("React Flow viewport not found.");

            const dataUrl = await toSvg(viewportEl, {
              width: imageWidth,
              height: imageHeight,
              style: {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              },
              backgroundColor: "white",
            });
            const blob = await (await fetch(dataUrl)).blob();
            saveAs(blob, `${diagram.name.replace(/\s+/g, "_")}.svg`);
          }
          onOpenChange(false);
          setSelectedFormat(null);
          return;
      }
      const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
      saveAs(blob, filename);
    } catch (error) {
      console.error("Export failed:", error);
      showError(
        `Export failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      onOpenChange(false);
      setSelectedFormat(null);
    }
  };

  const dbTypeDisplay = diagram?.dbType === "mysql" ? "MySQL" : "PostgreSQL";

  const shareOptions = [
    {
      id: "json",
      title: "JSON",
      icon: FileJson,
      description: "Export a JSON representation.",
    },
    {
      id: "svg",
      title: "SVG",
      icon: ImageIcon,
      description: "Export diagram as a .svg image.",
    },
  ];

  const queryOptions = [
    {
      id: "sql",
      title: dbTypeDisplay,
      icon: Database,
      description: `Export schema as ${dbTypeDisplay} DDL.`,
    },
    {
      id: "dbml",
      title: "DBML",
      icon: FileText,
      description: "Export a DBML representation.",
    },
    {
      id: "mermaid",
      title: "Mermaid",
      icon: FileText,
      description: "Export as Mermaid syntax.",
    },
  ];

  const codegenOptions = [
    {
      id: "laravel",
      title: "Laravel",
      icon: LaravelIcon,
      description: "Generate Laravel migration files.",
    },
    {
      id: "typeorm",
      title: "TypeORM",
      icon: TypeOrmIcon,
      description: "Generate TypeORM migration files.",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Export Diagram</DialogTitle>
          <DialogDescription>
            Select a format to export your diagram.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Share</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shareOptions.map((opt) => (
                <Card
                  key={opt.id}
                  onClick={() => setSelectedFormat(opt.id as ExportFormat)}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedFormat === opt.id
                      ? "border-primary ring-2 ring-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <CardHeader className="items-center p-4">
                    <opt.icon className="h-8 w-8 mb-2" />
                    <CardTitle className="text-base text-center">
                      {opt.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-xs text-muted-foreground p-4 pt-0">
                    {opt.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">General / Query</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {queryOptions.map((opt) => (
                <Card
                  key={opt.id}
                  onClick={() => setSelectedFormat(opt.id as ExportFormat)}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedFormat === opt.id
                      ? "border-primary ring-2 ring-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <CardHeader className="items-center p-4">
                    <opt.icon className="h-8 w-8 mb-2" />
                    <CardTitle className="text-base text-center">
                      {opt.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-xs text-muted-foreground p-4 pt-0">
                    {opt.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Code Generation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {codegenOptions.map((opt) => (
                <Card
                  key={opt.id}
                  onClick={() => setSelectedFormat(opt.id as ExportFormat)}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedFormat === opt.id
                      ? "border-primary ring-2 ring-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <CardHeader className="items-center p-4">
                    <opt.icon className={cn(
                      "h-8 w-8 mb-2",
                      opt.id === "laravel" ? "text-red-500" : opt.id === "typeorm" ? "text-orange-500" : ""
                    )} />
                    <CardTitle className="text-base text-center">
                      {opt.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-xs text-muted-foreground p-4 pt-0">
                    {opt.description}
                  </CardContent>
                </Card>
              ))}
            </div>
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