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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { relationshipTypes } from "@/lib/constants";
import { type AppNode, type Column } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface AddRelationshipDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  nodes: AppNode[];
  onCreateRelationship: (values: z.infer<typeof formSchema>) => void;
}

const formSchema = z.object({
  sourceNodeId: z.string().min(1, "Source table is required"),
  sourceColumnId: z.string().min(1, "Source column is required"),
  targetNodeId: z.string().min(1, "Target table is required"),
  targetColumnId: z.string().min(1, "Target column is required"),
  relationshipType: z.string().min(1, "Relationship type is required"),
});

export function AddRelationshipDialog({ isOpen, onOpenChange, nodes, onCreateRelationship }: AddRelationshipDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceNodeId: "",
      sourceColumnId: "",
      targetNodeId: "",
      targetColumnId: "",
      relationshipType: relationshipTypes[1]?.value || '',
    },
  });

  const sourceNodeId = form.watch("sourceNodeId");
  const targetNodeId = form.watch("targetNodeId");

  const sourceColumns = useMemo(() => {
    return nodes.find(n => n.id === sourceNodeId)?.data.columns || [];
  }, [nodes, sourceNodeId]);

  const targetColumns = useMemo(() => {
    return nodes.find(n => n.id === targetNodeId)?.data.columns || [];
  }, [nodes, targetNodeId]);

  // Reset column selections when table changes
  useEffect(() => {
    form.resetField("sourceColumnId");
  }, [sourceNodeId, form]);

  useEffect(() => {
    form.resetField("targetColumnId");
  }, [targetNodeId, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onCreateRelationship(values);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Relationship</DialogTitle>
          <DialogDescription>
            Define a new relationship by selecting the source and target tables and columns.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-4">
              {/* Source Selection */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-center">From (Source)</h4>
                <FormField
                  control={form.control}
                  name="sourceNodeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Table</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a table" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nodes.filter(n => n.id !== targetNodeId).map(node => (
                            <SelectItem key={node.id} value={node.id}>{node.data.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceColumnId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Column</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!sourceNodeId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a column" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sourceColumns.map((col: Column) => (
                            <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-center h-full pt-16">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Target Selection */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-center">To (Target)</h4>
                <FormField
                  control={form.control}
                  name="targetNodeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Table</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a table" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {nodes.filter(n => n.id !== sourceNodeId).map(node => (
                            <SelectItem key={node.id} value={node.id}>{node.data.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetColumnId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Column</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!targetNodeId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a column" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetColumns.map((col: Column) => (
                            <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="max-w-sm mx-auto">
              <FormField
                control={form.control}
                name="relationshipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a relationship type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {relationshipTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit">Create Relationship</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}