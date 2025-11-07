# What’s New in ThothBlueprint v0.0.6

Welcome to v0.0.6 — a big step forward for importing and organizing real-world database schemas.

## Highlights

- Database import support: import dump schemas (MySQL, PostgreSQL) to jump-start diagram creation.
- Faster, smoother editor performance for large diagrams.
- Better control over layout and organization.

## New & Improved

- New MySQL DDL Import Feature — import a MySQL SQL DDL file or script and generate a diagram from its structure. (8bee30f)
- Enhanced DDL Parser — now asynchronous to handle larger scripts without blocking the UI, with broader parsing capabilities for more MySQL syntax and configurations. (b972563)
- Diagram Gallery Sorting and Searching — quickly find diagrams with A–Z sorting and a search bar.
- Relationship-Based Layout Algorithm — automatically organizes tables based on foreign-key relationships.
- Zone-Aware Reorganization — lock specific elements and reorganize others within defined zones.
- Diagram Duplication — duplicate existing diagrams to iterate faster.
- Table Overlap Option — allow tables to overlap during manual creation when you need compact layouts.

## Performance & Stability

- Optimized data lookups using Maps and memoization across components.
- Improved importer logic for handling long MySQL DDL scripts.
- Enhanced rendering performance and stability for big diagrams.
- State management refactoring for consistent behavior across diagram states.

## Tips

- Use Gallery sort/search to quickly navigate large sets of diagrams.
- To import, choose “Import Diagram” from the Gallery or the menubar.
- Lock zones before reorganizing to protect key areas of your diagram.

Thanks for using ThothBlueprint!