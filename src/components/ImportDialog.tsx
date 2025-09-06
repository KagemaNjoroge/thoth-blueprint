import { useRef } from "react";
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
import { DatabaseType, Diagram } from "@/lib/db";
import { showError } from "@/utils/toast";
import { importFromJson } from "@/lib/importer";
import { Upload } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Diagram name is required"),
  dbType: z.enum(["mysql", "postgres"]),
  content: z.string().min(1, "Content to import is required"),
});

interface ImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImportDiagram: (diagramData: { name: string; dbType: DatabaseType; data: Diagram['data'] }) => void;
}

export function ImportDialog({ isOpen, onOpenChange, onImportDiagram }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dbType: "postgres",
      content: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        form.setValue("content", content);
      };
      reader.readAsText(file);
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const diagramData = importFromJson(values.content);
      const dbType = values.dbType as DatabaseType;
      
      onImportDiagram({ name: values.name, dbType, data: diagramData });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Import failed:", error);
      const errorMessage = error instanceof Error ? `Import failed: ${error.message}` : "An unknown error occurred during import.";
      showError(errorMessage);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Diagram from JSON</DialogTitle>
          <DialogDescription>
            Import a diagram from a JSON file previously exported from this application.
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
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>JSON Content</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <Input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".json"
                    />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder={`Paste your JSON content here or upload a file...`}
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