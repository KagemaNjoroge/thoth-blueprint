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
    let dbmlString = '';

    nodes.filter(n => !n.data.isDeleted).forEach((node: Node) => {
        dbmlString += `Table ${node.data.label} {\n`;
        if (node.data.comment) {
            dbmlString += `  note: '''${node.data.comment}'''\n`;
        }

        node.data.columns.forEach((col: Column) => {
            dbmlString += `  ${col.name} ${col.type}`;
            
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
                dbmlString += ` [${settings.join(', ')}]`;
            }
            dbmlString += '\n';
        });

        if (node.data.indices && node.data.indices.length > 0) {
            dbmlString += `\n  Indexes {\n`;
            node.data.indices.forEach((index: any) => {
                const columnNames = index.columns.map((colId: string) => node.data.columns.find((c: Column) => c.id === colId)?.name).filter(Boolean);
                if (columnNames.length > 0) {
                    dbmlString += `    (${columnNames.join(', ')}) [name: '${index.name}'${index.isUnique ? ', unique' : ''}]\n`;
                }
            });
            dbmlString += `  }\n`;
        }

        dbmlString += '}\n\n';
    });

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
            dbmlString += `Ref: ${sourceNode.data.label}.${sourceColumn.name} ${relationship} ${targetNode.data.label}.${targetColumn.name}\n`;
        }
    });

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