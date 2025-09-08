export const AppIntro = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
      <img src="/ThothBlueprint-icon.svg" alt="ThothBlueprint Logo" className="h-16 w-16 flex-shrink-0" />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ThothBlueprint</h2>
        <p className="text-muted-foreground max-w-2xl mt-2">
          Visualize your database schema with our intuitive drag-and-drop editor. When you're done, export your design to SQL, DBML, JSON, SVG, or generate migration files for frameworks like Laravel, TypeORM, and Django. Get started by creating a new diagram.
        </p>
      </div>
    </div>
  );
};