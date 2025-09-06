import { importer, Database as DbmlDatabase } from '@dbml/core';
import { Diagram, DatabaseType } from './db';
import { Node, Edge } from 'reactflow';

const tableColors = [
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', 
  '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#4ADE80',
];

// Helper to map DBML relationship to our format
function mapRelationship(dbmlRef: any): string {
    switch (dbmlRef.type) {
        case 'one-to-one': return 'one-to-one';
        case 'one-to-many': return 'one-to-many';
        case 'many-to-one': return 'many-to-one';
        case 'many-to-many': return 'many-to-many';
        default: return 'one-to-many';
    }
}

// Helper to transform the parsed DBML database object into our Diagram data format
function transformDbmlDatabase(dbmlDatabase: DbmlDatabase): Diagram['data'] {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const tableMap = new Map<string, { node: Node, columns: Map<string, any> }>();

    const schema = dbmlDatabase.schemas[0];
    if (!schema) {
        throw new Error("No schema found in the imported file.");
    }

    // First pass: create nodes and map tables/columns
    schema.tables.forEach((table, index) => {
        const columns = (table.fields || []).map(field => {
            const columnSettings = field.settings || {};
            return {
                id: `col_${table.name}_${field.name}`,
                name: field.name,
                type: field.type.type_name,
                pk: field.pk,
                nullable: field.not_null === false,
                defaultValue: field.dbdefault?.value,
                isUnique: !!columnSettings.unique,
                isAutoIncrement: !!columnSettings.increment,
                comment: field.note?.value,
            };
        });

        const node: Node = {
            id: table.name,
            type: 'table',
            position: { x: (index % 5) * 300, y: Math.floor(index / 5) * 400 },
            data: {
                label: table.name,
                columns: columns,
                comment: table.note?.value,
                color: tableColors[index % tableColors.length],
                order: index,
            },
        };
        nodes.push(node);
        
        const columnMap = new Map(columns.map(c => [c.name, c]));
        tableMap.set(table.name, { node, columns: columnMap });
    });

    // Second pass: create edges
    schema.refs.forEach((ref, index) => {
        const sourceEndpoint = ref.endpoints[0];
        const targetEndpoint = ref.endpoints[1];

        const sourceTable = tableMap.get(sourceEndpoint.tableName);
        const targetTable = tableMap.get(targetEndpoint.tableName);
        
        // Assuming single-column relationships for now
        const sourceColumn = sourceTable?.columns.get(sourceEndpoint.fieldNames[0]);
        const targetColumn = targetTable?.columns.get(targetEndpoint.fieldNames[0]);

        if (sourceTable && targetTable && sourceColumn && targetColumn) {
            const edge: Edge = {
                id: `edge_${index}`,
                source: sourceTable.node.id,
                target: targetTable.node.id,
                sourceHandle: sourceColumn.id,
                targetHandle: targetColumn.id,
                type: 'custom',
                data: {
                    relationship: mapRelationship(ref),
                },
            };
            edges.push(edge);
        }
    });

    return {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        isLocked: false,
    };
}

export async function importFromSql(sql: string, dbType: DatabaseType): Promise<Diagram['data']> {
    const dbmlDatabase = await importer.import(sql, dbType);
    return transformDbmlDatabase(dbmlDatabase);
}

export async function importFromDbml(dbml: string): Promise<Diagram['data']> {
    const dbmlDatabase = await importer.import(dbml, 'dbml');
    return transformDbmlDatabase(dbmlDatabase);
}

export function importFromJson(json: string): Diagram['data'] {
    try {
        const data = JSON.parse(json);
        // Basic validation
        if (data && Array.isArray(data.nodes) && Array.isArray(data.edges) && data.viewport) {
            return {
                nodes: data.nodes,
                edges: data.edges,
                viewport: data.viewport,
                isLocked: data.isLocked ?? false,
            };
        }
        throw new Error("Invalid JSON structure for diagram import.");
    } catch (e) {
        throw new Error("Failed to parse JSON file. Please ensure it's a valid export from this application.");
    }
}