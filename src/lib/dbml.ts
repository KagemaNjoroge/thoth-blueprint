import { Diagram } from './db';
import { Node, Edge } from 'reactflow';
import { exporter } from '@dbml/core';

interface Column {
    id: string;
    name: string;
    type: string;
    pk?: boolean;
    nullable?: boolean;
    defaultValue?: any;
    isUnique?: boolean;
    isAutoIncrement?: boolean;
    comment?: string;
    enumValues?: string;
}

const diagramToDbml = (diagram: Diagram): string => {
    const { nodes, edges } = diagram.data;
    let tableDbml = '';
    const enumDefinitions = new Set<string>();
    const enumTypeMap = new Map<string, string>();

    // First pass: find all enums and prepare definitions
    nodes.filter(n => !n.data.isDeleted).forEach((node: Node) => {
        node.data.columns.forEach((col: Column) => {
            if (col.type.toUpperCase() === 'ENUM' && col.enumValues) {
                const enumTypeName = `${node.data.label}_${col.name}_enum`;
                // Use a unique key for the map, combining node and column IDs
                enumTypeMap.set(`${node.id}-${col.id}`, enumTypeName);
                
                const values = col.enumValues.split(',')
                    .map(v => v.trim())
                    .filter(v => v)
                    .map(v => `  "${v}"`).join('\n');
                
                const enumDef = `Enum ${enumTypeName} {\n${values}\n}\n`;
                enumDefinitions.add(enumDef);
            }
        });
    });

    // Second pass: build table definitions using the enum map
    nodes.filter(n => !n.data.isDeleted).forEach((node: Node) => {
        tableDbml += `Table ${node.data.label} {\n`;
        if (node.data.comment) {
            tableDbml += `  note: '''${node.data.comment}'''\n`;
        }

        node.data.columns.forEach((col: Column) => {
            let columnType = enumTypeMap.get(`${node.id}-${col.id}`) || col.type;
            
            // Add default lengths for certain MySQL types that require it
            if (diagram.dbType === 'mysql') {
                const upperType = columnType.toUpperCase();
                if (upperType === 'VARCHAR') {
                    columnType = 'VARCHAR(255)';
                } else if (upperType === 'CHAR') {
                    columnType = 'CHAR(255)';
                }
            }

            tableDbml += `  ${col.name} ${columnType}`;
            
            const settings = [];
            if (col.pk) settings.push('pk');
            if (col.isUnique) settings.push('unique');
            if (col.isAutoIncrement) settings.push('increment');
            if (!col.nullable) settings.push('not null');
            if (col.defaultValue !== undefined && col.defaultValue !== null && col.defaultValue !== '') {
                if (typeof col.defaultValue === 'string' && !/^\d+$/.test(col.defaultValue)) {
                    settings.push(`default: '${col.defaultValue}'`);
                } else {
                    settings.push(`default: ${col.defaultValue}`);
                }
            }
            if (col.comment) {
                settings.push(`note: '${col.comment}'`);
            }

            if (settings.length > 0) {
                tableDbml += ` [${settings.join(', ')}]`;
            }
            tableDbml += '\n';
        });

        if (node.data.indices && node.data.indices.length > 0) {
            tableDbml += `\n  Indexes {\n`;
            node.data.indices.forEach((index: any) => {
                const columnNames = index.columns.map((colId: string) => node.data.columns.find((c: Column) => c.id === colId)?.name).filter(Boolean);
                if (columnNames.length > 0) {
                    tableDbml += `    (${columnNames.join(', ')}) [name: '${index.name}'${index.isUnique ? ', unique' : ''}]\n`;
                }
            });
            tableDbml += `  }\n`;
        }

        tableDbml += '}\n\n';
    });

    let relationshipsDbml = '';
    edges.forEach((edge: Edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const sourceColumn = sourceNode?.data.columns.find((c: Column) => c.id === edge.sourceHandle);
        const targetColumn = targetNode?.data.columns.find((c: Column) => c.id === edge.targetHandle);

        if (sourceNode && targetNode && sourceColumn && targetColumn) {
            let relationship = '-';
            switch (edge.data?.relationship) {
                case 'one-to-one': relationship = '-'; break;
                case 'one-to-many': relationship = '<'; break;
                case 'many-to-one': relationship = '>'; break;
                case 'many-to-many': relationship = '<>'; break;
            }
            relationshipsDbml += `Ref: ${sourceNode.data.label}.${sourceColumn.name} ${relationship} ${targetNode.data.label}.${targetColumn.name}\n`;
        }
    });

    // Combine all parts, with enums first to ensure correct dependency order
    const dbmlString = Array.from(enumDefinitions).join('\n') + tableDbml + relationshipsDbml;
    return dbmlString;
};

export const exportToDbml = (diagram: Diagram): string => {
    return diagramToDbml(diagram);
};

export const exportToSql = (diagram: Diagram): string => {
    const dbmlString = diagramToDbml(diagram);
    return exporter.export(dbmlString, diagram.dbType);
};

export const exportToJson = (diagram: Diagram): string => {
    return JSON.stringify(diagram.data, null, 2);
};