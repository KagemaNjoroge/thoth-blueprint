import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { importFromJson } from "@/lib/importer";
import { parseMySqlDdl } from "@/lib/importer/mysql-ddl-parser";
import { type DatabaseType, type Diagram } from "@/lib/types";
import { cn } from "@/lib/utils";
import { showError } from "@/utils/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Terminal, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Diagram name is required"),
  dbType: z.enum(["mysql", "postgres"]),
  importType: z.enum(["json", "sql"]),
  content: z.string().min(1, "Content to import is required"),
});

interface ImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImportDiagram: (diagramData: { name: string; dbType: DatabaseType; data: Diagram['data'] }) => void;
}

export function ImportDialog({ isOpen, onOpenChange, onImportDiagram }: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState("json");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dbType: "mysql",
      importType: "json",
      content: "",
    },
  });

  const content = form.watch("content");

  const handleFileRead = useCallback((file: File) => {
    const acceptedExtension = activeTab === 'json' ? '.json' : '.sql';
    if (!file.name.endsWith(acceptedExtension)) {
      showError(`Invalid file type. Please upload a ${acceptedExtension} file.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      form.setValue("content", fileContent);
    };
    reader.readAsText(file);
  }, [activeTab, form]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      handleFileRead(file);
    }
  }, [handleFileRead]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTab === 'json' ? { 'application/json': ['.json'] } : { 'application/sql': ['.sql'] },
    multiple: false,
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    form.setValue("importType", value as "json" | "sql");
    form.setValue("content", ""); // Clear content on tab switch
    form.clearErrors("content");
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let diagramData: Diagram['data'];
      const dbType = values.dbType as DatabaseType;

      if (values.importType === "json") {
        diagramData = importFromJson(values.content);
      } else if (values.importType === "sql") {
        if (dbType !== 'mysql') {
          showError("Sorry, only MySQL DDL import is supported at the moment.");
          return;
        }
        diagramData = parseMySqlDdl(values.content);
      } else {
        throw new Error("Invalid import type");
      }

      onImportDiagram({ name: values.name, dbType, data: diagramData });
      onOpenChange(false);
      form.reset();
      setActiveTab("json");
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
          <DialogTitle>Import Diagram</DialogTitle>
          <DialogDescription>
            Import a diagram from JSON or a SQL schema file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="json">From JSON</TabsTrigger>
                <TabsTrigger value="sql">From SQL (DDL)</TabsTrigger>
              </TabsList>
              <TabsContent value="json" className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Import a diagram from a JSON file previously exported from this application.
                </p>
              </TabsContent>
              <TabsContent value="sql" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Import a diagram from a MySQL `CREATE TABLE` script.
                </p>
                <Alert>
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>How to get your MySQL schema</AlertTitle>
                  <AlertDescription>
                    <p>
                      You can generate a schema file from your database using the `mysqldump` command.
                      Run the following command in your terminal:
                    </p>
                    <pre className="mt-2 p-2 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                      <code>
                        mysqldump --no-data -u [username] -p [database_name] &gt; schema.sql
                      </code>
                    </pre>
                    <p className="mt-2 text-xs">
                      Replace `[username]` and `[database_name]` with your database credentials.
                      The `--no-data` flag ensures only the table structure is exported.
                    </p>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  {content ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel>
                          {activeTab === 'json' ? 'JSON Content' : 'SQL Content'}
                        </FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue("content", "")}
                        >
                          Clear and re-upload
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder={`Paste content, upload a file, or drag and drop here...`}
                          className="min-h-[200px] font-mono"
                          {...field}
                        />
                      </FormControl>
                    </div>
                  ) : (
                    <div
                      {...getRootProps({
                        className: cn(
                          "relative border-2 border-dashed rounded-lg p-4 transition-colors h-[240px] flex flex-col items-center justify-center text-center cursor-pointer",
                          isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        )
                      })}
                    >
                      <input {...getInputProps()} />
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      {isDragActive ? (
                        <p className="text-lg font-semibold text-primary">Drop the file here...</p>
                      ) : (
                        <>
                          <p className="text-muted-foreground mb-2">
                            Drag & drop a file here, or click to select a file
                          </p>
                          <p className="text-xs text-muted-foreground">
                            (Only {activeTab === 'json' ? '*.json' : '*.sql'} files will be accepted)
                          </p>
                        </>
                      )}
                    </div>
                  )}
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