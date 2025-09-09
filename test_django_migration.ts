// Test to verify Django migration generation
import { Diagram } from "@/lib/db";
import { generateDjangoMigrationString } from "@/lib/codegen/django/migration-generator";

// Create a test diagram that matches your examples
const createTestDiagram = (): Diagram => {
  const diagram: Diagram = {
    name: "Test Diagram",
    dbType: "mysql",
    data: {
      nodes: [
        {
          id: "category_node",
          type: "table",
          data: {
            label: "Category",
            columns: [
              {
                id: "cat_id",
                name: "id",
                type: "INT",
                pk: true,
                isAutoIncrement: true,
                nullable: false
              },
              {
                id: "cat_name",
                name: "name",
                type: "VARCHAR",
                length: 100,
                nullable: false
              }
            ],
            indices: [],
            comment: "",
            color: "",
            isDeleted: false,
            order: 0
          },
          position: { x: 0, y: 0 }
        },
        {
          id: "post_node",
          type: "table",
          data: {
            label: "Post",
            columns: [
              {
                id: "post_id",
                name: "id",
                type: "INT",
                pk: true,
                isAutoIncrement: true,
                nullable: false
              },
              {
                id: "post_title",
                name: "title",
                type: "VARCHAR",
                length: 250,
                nullable: false
              },
              {
                id: "post_excerpt",
                name: "excerpt",
                type: "TEXT",
                nullable: true
              },
              {
                id: "post_category",
                name: "category",
                type: "INT",
                nullable: false,
                defaultValue: 1
              }
            ],
            indices: [],
            comment: "",
            color: "",
            isDeleted: false,
            order: 1
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: [
        {
          id: "fk_edge",
          source: "post_node",
          target: "category_node",
          sourceHandle: "post_category-source-right",
          targetHandle: "cat_id-target-left",
          data: {
            relationship: "PROTECT"  // Django's PROTECT is equivalent to SQL's RESTRICT
          }
        }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return diagram;
};

// Generate migration
const testDiagram = createTestDiagram();
const migrationString = generateDjangoMigrationString(testDiagram);
console.log(migrationString);