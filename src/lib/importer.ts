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

    const schema = dbmlDatabase.schemas?.[0];
    const tables = schema?.tables || (dbmlDatabase as any).tables || [];
    const refs = schema?.refs || (dbmlDatabase as any).refs || [];

    if (tables.length === 0) {
        throw new Error("Could not find any tables in the imported file. Please check the file content.");
    }

    tables.forEach((table: any, index: number) => {
        const columns = (table.fields || []).map((field: any) => {
            const columnSettings = field.settings || {};
            const col: any = {
                id: `col_${table.name}_${field.name}`,
                name: field.name,
                type: field.type.args ? `${field.type.type_name}(${field.type.args})` : field.type.type_name,
                pk: field.pk,
                nullable: !field.not_null,
                defaultValue: field.dbdefault?.value,
                isUnique: !!columnSettings.unique,
                isAutoIncrement: !!columnSettings.increment,
                comment: field.note?.value,
            };
            if (field.type.type_name.toUpperCase() === 'ENUM' && field.type.args) {
                col.enumValues = field.type.args.replace(/'/g, '').replace(/ /g, '');
            }
            return col;
        });

        const indices = (table.indexes || []).map((index: any, idx: number) => {
            const indexColumns = index.columns.map((c: any) => {
                if (typeof c.value === 'string') {
                    const column = columns.find(col => col.name === c.value);
                    return column?.id;
                }
                return null;
            }).filter((id): id is string => !!id);
        
            return {
                id: `idx_${table.name}_${idx}`,
                name: index.name || `${table.name}_index_${idx}`,
                columns: indexColumns,
                isUnique: !!index.unique,
            };
        });

        const node: Node = {
            id: table.name,
            type: 'table',
            position: { x: (index % 5) * 300, y: Math.floor(index / 5) * 400 },
            data: {
                label: table.name,
                columns: columns,
                indices: indices,
                comment: table.note?.value,
                color: tableColors[index % tableColors.length],
                order: index,
            },
        };
        nodes.push(node);
        
        const columnMap = new Map(columns.map(c => [c.name, c]));
        tableMap.set(table.name, { node, columns: columnMap });
    });

    refs.forEach((ref: any, index: number) => {
        const sourceEndpoint = ref.endpoints[0];
        const targetEndpoint = ref.endpoints[1];

        const sourceTable = tableMap.get(sourceEndpoint.tableName);
        const targetTable = tableMap.get(targetEndpoint.tableName);
        
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
    try {
        // First attempt: parse the original content
        const dbmlDatabase = await importer.import(dbml, 'dbml');
        return transformDbmlDatabase(dbmlDatabase);
    } catch (initialError) {
        console.warn("Initial DBML parsing failed. Attempting auto-correction.", initialError);

        // Apply all known corrections
        // Correction 1: Replace `column: type` with `column type`
        let correctedDbml = dbml.replace(/^(\s*['"]?\w+['"]?): ([\w\(\), ]+)/gm, '$1 $2');
        
        // Correction 2: Remove trailing commas before a closing brace `}`
        correctedDbml = correctedDbml.replace(/,(\s*})/g, '$1}');

        try {
            // Second attempt: parse the corrected content
            const dbmlDatabase = await importer.import(correctedDbml, 'dbml');
            console.log("DBML auto-correction successful.");
            return transformDbmlDatabase(dbmlDatabase);
        } catch (correctedError) {
            console.error("DBML parsing failed even after auto-correction.", correctedError);
            // If the second attempt also fails, throw the original error as it's likely more relevant
            // to the user's original file content.
            throw initialError; 
        }
    }
}

export function importFromJson(json: string): Diagram['data'] {
    try {
        const data = JSON.parse(json);
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