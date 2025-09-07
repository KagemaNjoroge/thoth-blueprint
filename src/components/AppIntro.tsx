export const AppIntro = () => {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <img src="/ThothBlueprint-icon.svg" alt="ThothBlueprint Logo" className="h-12 w-12" />
      <h2 className="text-3xl font-bold tracking-tight">ThothBlueprint</h2>
      <p className="text-muted-foreground max-w-lg">
        Welcome! Visualize your database schema, create tables, and define relationships with our intuitive drag-and-drop editor. Get started by creating a new diagram.
      </p>
    </div>
  );
};