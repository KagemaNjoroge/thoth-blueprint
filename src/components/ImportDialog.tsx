import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseType, Diagram } from "@/lib/db";
import { showError } from "@/utils/toast";
import { importFromSql, importFromDbml, importFromJson } from "@/lib/importer";

const formSchema = z.object({
  name: z.string().min(1, "Diagram name is required"),
  dbType: z.enum(["mysql", "postgres"]),
  content: z.string().min(1, "Content to import is required"),
});

type ImportFormat = "sql" | "dbml" | "json";

interface ImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImportDiagram: (diagramData: { name: string; dbType: DatabaseType; data: Diagram['data'] }) => void;
}

export function ImportDialog({ isOpen, onOpenChange, onImportDiagram }: ImportDialogProps) {
  const [importFormat, setImportFormat] = useState<ImportFormat>("sql");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dbType: "postgres",
      content: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let diagramData: Diagram['data'];
      const dbType = values.dbType as DatabaseType;

      switch (importFormat) {
        case "sql":
          diagramData = await importFromSql(values.content, dbType);
          break;
        case "dbml":
          diagramData = await importFromDbml(values.content);
          break;
        case "json":
          diagramData = importFromJson(values.content);
          break;
        default:
          throw new Error("Invalid import format");
      }
      
      onImportDiagram({ name: values.name, dbType, data: diagramData });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Import failed:", error);
      showError(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Diagram</DialogTitle>
          <DialogDescription>
            Import a diagram from SQL, DBML, or a JSON export.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagram Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Imported Schema" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Tabs value={importFormat} onValueChange={(value) => setImportFormat(value as ImportFormat)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sql">SQL</TabsTrigger>
                <TabsTrigger value="dbml">DBML</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </Tabs>
            {importFormat === 'sql' && (
              <FormField
                control={form.control}
                name="dbType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a database type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                        <SelectItem value="mysql">MySQL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Paste your ${importFormat.toUpperCase()} content here...`}
                      className="min-h-[200px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Import Diagram</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}