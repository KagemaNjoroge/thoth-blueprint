import { BrainCircuit } from "lucide-react";

export const AppIntro = () => {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <BrainCircuit className="h-12 w-12 text-primary" />
      <h2 className="text-3xl font-bold tracking-tight">Database Designer</h2>
      <p className="text-muted-foreground max-w-lg">
        Welcome! Visualize your database schema, create tables, and define relationships with our intuitive drag-and-drop editor. Get started by creating a new diagram.
      </p>
    </div>
  );
};