# ThothBlueprint Database Designer - Developer Documentation

## 1. Project Overview and Purpose

ThothBlueprint is a visual database schema designer application that allows users to create, edit, and export database diagrams using an intuitive drag-and-drop interface. The application provides a comprehensive environment for designing database schemas with features like table creation, relationship mapping, note-taking, and zone organization.

### Key Features:
- Visual drag-and-drop interface for database schema design
- Support for MySQL and PostgreSQL database types
- Table creation with customizable columns, data types, constraints, and indices
- Relationship mapping between tables (one-to-one, one-to-many, many-to-many)
- Export functionality to multiple formats (SQL, DBML, JSON, SVG, PNG, Mermaid)
- Code generation for popular frameworks (Laravel, TypeORM, Django)
- Responsive design with light/dark theme support
- Progressive Web App (PWA) capabilities for offline use
- Local storage using IndexedDB (Dexie.js)

## 2. Key Components and Their Responsibilities

### Core Components:

#### Layout (`src/components/Layout.tsx`)
The main application layout that manages the overall structure including:
- Diagram gallery view
- Diagram editor view
- Sidebar management (docked/collapsed states)
- Diagram selection and state management
- Integration with database persistence

#### DiagramEditor (`src/components/DiagramEditor.tsx`)
The core diagram editing component responsible for:
- Rendering the visual diagram using React Flow
- Managing nodes (tables, notes, zones) and edges (relationships)
- Handling drag-and-drop interactions
- Managing selection states
- Implementing lock/unlock functionality
- Saving diagram changes to the database

#### TableNode (`src/components/TableNode.tsx`)
Represents individual database tables in the diagram with:
- Visual rendering of table structure
- Column management (add/edit/delete)
- Index management
- Context menu for table operations

#### CustomEdge (`src/components/CustomEdge.tsx`)
Custom edge component for visualizing relationships between tables with:
- Relationship type visualization (one-to-one, one-to-many, etc.)
- Visual highlighting on selection
- Context menu for relationship operations

#### ExportDialog (`src/components/ExportDialog.tsx`)
Central export functionality component that handles:
- Multiple export format selection (SQL, DBML, JSON, SVG, PNG, Mermaid)
- Framework-specific code generation (Laravel, TypeORM, Django)
- Zip file generation for framework migrations
- Image export using html-to-image library

### Database Management:

#### Database (`src/lib/db.ts`)
Manages local storage using Dexie.js (IndexedDB wrapper):
- Diagram persistence with versioning
- Application state management
- Schema migration handling

#### Types (`src/lib/types.ts`)
Defines all TypeScript interfaces and types for:
- Diagram structure
- Table nodes and columns
- Relationships and edges
- Notes and zones
- Application state

### Export and Code Generation:

#### DBML Utilities (`src/lib/dbml.ts`)
Handles export to DBML and SQL formats:
- Conversion from internal diagram format to DBML
- Support for enums and complex data types
- Database-specific SQL generation (MySQL/PostgreSQL)

#### Mermaid Utilities (`src/lib/mermaid.ts`)
Handles export to Mermaid diagram format:
- ER diagram generation
- Relationship visualization

#### Code Generation Modules:
- Laravel (`src/lib/codegen/laravel/`)
- TypeORM (`src/lib/codegen/typeorm/`)
- Django (`src/lib/codegen/django/`)

Each module generates framework-specific migration files and handles zip export functionality.

### UI Components:

The application uses shadcn/ui components extensively for a consistent, accessible UI:
- Dialogs, sheets, and modals
- Buttons, cards, and form elements
- Resizable panels for flexible layout
- Context menus for quick actions
- Toast notifications for user feedback

## 3. How to Use the Application

### Creating Diagrams:
1. Open the application to view the diagram gallery
2. Click "Create New Diagram" to start a new database design
3. Choose database type (MySQL or PostgreSQL)
4. Add tables using the "+" button or right-click context menu
5. Define columns with appropriate data types and constraints
6. Create relationships between tables by connecting column handles
7. Add notes and zones for documentation and organization

### Editing Diagrams:
- Drag tables to reposition them
- Edit table properties through the inspector sidebar
- Add/remove columns and indices
- Modify relationship types
- Lock/unlock diagrams to prevent accidental changes

### Exporting Diagrams:
1. Open the export dialog from the sidebar
2. Choose from three categories of export formats:
   - Share: JSON, SVG, PNG
   - General/Query: SQL, DBML, Mermaid
   - Code Generation: Laravel, TypeORM, Django
3. For code generation formats, the application creates zip files containing framework-specific migration files

### Managing Diagrams:
- View all diagrams in the gallery
- Rename or delete diagrams
- Recently edited diagrams are automatically saved

## 4. Development Setup Instructions

### Prerequisites:
- Node.js (version 16 or higher)
- pnpm package manager

### Initial Setup:
```bash
# Clone the repository
git clone <repository-url>
cd database-designer

# Install dependencies
pnpm install
```

### Development:
```bash
# Start development server
pnpm run dev

# The application will be available at http://localhost:8080
```

### Building for Production:
```bash
# Build the application
pnpm run build

# Preview the built application
pnpm run preview
```

### Code Quality:
```bash
# Run ESLint for code linting
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix

# Run TypeScript type checking
pnpm run type-check
```

### Project Structure:
```
src/
├── components/     # React components
├── lib/            # Utility functions and business logic
├── pages/          # Page components
├── utils/          # Helper functions
└── App.tsx         # Main application component
```

## 5. Key Technologies Used

### Frontend Framework:
- **React 18** with TypeScript for UI development
- **React Router** for client-side routing
- **Vite** as the build tool and development server

### State Management:
- **React Hooks** for local component state
- **Dexie.js** for IndexedDB-based persistence
- **React Query** for data fetching and caching

### UI Libraries:
- **Tailwind CSS** for styling
- **shadcn/ui** components built on Radix UI primitives
- **Lucide React** for icons

### Diagramming:
- **React Flow** for node-based diagram rendering

### Export and File Handling:
- **JSZip** for zip file generation
- **FileSaver.js** for file downloads
- **html-to-image** for image export (SVG/PNG)

### Code Quality:
- **ESLint** with TypeScript support
- **Prettier** for code formatting
- **TypeScript** for type safety

### Progressive Web App:
- **Vite PWA Plugin** for PWA functionality
- Service workers for offline support

## 6. Export Functionality and Zip Export Refactoring

### Export Formats:
The application supports exporting diagrams to multiple formats:
1. **SQL** - Generates database-specific DDL statements
2. **DBML** - Database Markup Language representation
3. **JSON** - Raw diagram data structure
4. **SVG/PNG** - Visual representation of the diagram
5. **Mermaid** - Mermaid ER diagram syntax
6. **Framework-specific** - Code generation for Laravel, TypeORM, and Django

### Recent Zip Export Refactoring:
The zip export functionality was recently refactored to improve code organization and maintainability:

#### Before Refactoring:
- Zip generation logic was scattered across multiple components
- Repeated code for handling JSZip and file-saver operations

#### After Refactoring:
- Centralized `downloadZip` utility function in `src/lib/utils/zip-export.ts`
- Standardized interface for migration files:
  ```typescript
  interface MigrationFile {
    filename: string;
    content: string;
  }
  ```
- Consistent API across all code generation modules:
  - Laravel: `generateLaravelMigration()`
  - TypeORM: `generateTypeOrmMigration()`
  - Django: `generateDjangoMigration()`

#### Implementation Details:
1. **Centralized Zip Utility**:
   - Located in `src/lib/utils/zip-export.ts`
   - Uses JSZip library to create zip archives
   - Uses FileSaver.js to trigger downloads
   - Handles error cases and empty file arrays

2. **Code Generation Modules**:
   - Each framework has its own generator in `src/lib/codegen/`
   - Returns array of `MigrationFile` objects
   - Handles framework-specific conventions and syntax
   - Maintains proper file naming conventions

3. **Export Dialog Integration**:
   - `ExportDialog.tsx` component orchestrates the export process
   - Calls appropriate generator based on selected format
   - Uses `downloadZip` utility for framework exports
   - Handles direct exports for non-zip formats

### Example Usage:
```typescript
// Generate Laravel migrations
const migrationFiles = generateLaravelMigration(diagram);

// Download as zip
await downloadZip(
  migrationFiles,
  `${diagram.name.replace(/\s+/g, "_")}_laravel_migrations.zip`
);
```

## 7. Additional Developer Information

### Theming:
- Light/dark theme support using next-themes
- CSS variables for consistent color management
- Tailwind CSS with custom color palette

### Performance Considerations:
- Debounced saving to IndexedDB to prevent excessive writes
- Lazy loading of pages and components
- Virtualized lists for better rendering performance
- Memoization of expensive calculations

### Accessibility:
- Keyboard navigation support
- Proper ARIA attributes on components
- Focus management for dialogs and modals
- Semantic HTML structure

### Offline Support:
- PWA implementation for offline usage
- Service worker caching strategies
- Local storage for all diagram data

### Error Handling:
- Comprehensive error handling in async operations
- User-friendly error messages via toast notifications
- Graceful degradation for failed operations

### Testing:
- While not explicitly configured in the project files, the application follows modern React best practices that facilitate testing
- Component isolation makes unit testing straightforward
- TypeScript provides compile-time error checking