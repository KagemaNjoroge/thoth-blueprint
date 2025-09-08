export const AppIntro = () => {
  return (
    <div className="flex flex-row items-center gap-4 text-left md:flex-col md:text-center">
      <img src="/ThothBlueprint-icon.svg" alt="ThothBlueprint Logo" className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0" />
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">ThothBlueprint</h2>
        <p className="text-muted-foreground max-w-2xl mt-1 text-sm md:text-base">
          Visualize your database schema with our intuitive drag-and-drop editor. When you're done, export your design to SQL, DBML, JSON, SVG, or generate migration files for frameworks like Laravel, TypeORM, and Django. Get started by creating a new diagram.
        </p>
      </div>
    </div>
  );
};