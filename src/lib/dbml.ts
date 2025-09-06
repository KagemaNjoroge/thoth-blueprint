import { Diagram } from './db';
import { Node, Edge } from 'reactflow';
import { Parser } from '@dbml/core';

const tableColors = [
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', 
  '#2DD4BF', '#F472B6', '#FB923C', '#818CF8', '#4ADE80',
];

const getRelationshipSymbol = (relationship: string) => {
    switch (relationship) {
        case 'one-to-one': return '-';
        case 'one-to-many': return '>';
        case 'many-to-one': return '<';
        case 'many-to-many': return '<>';
        default: return '>';
    }
};

const getRelationshipType = (token: string) => {
    switch (token) {
        case '-': return 'one-to-one';
        case '>': return 'one-to-many';
        case '<': return 'many-to-one';
        case '<>': return 'many-to-many';
        default: return 'one-to-many';
    }
}

export function generateDbml(diagram: Diagram): string {
    let dbml = '';
    const { nodes, edges } = diagram.data;

    nodes.filter(n => !n.data.isDeleted).forEach(node => {
        dbml += `Table ${node.data.label} {\n`;
        if (node.data.comment) {
            dbml += `  note: '''${node.data.comment}'''\n`
        }
        node.data.columns.forEach((col: any) => {
            let settings = [];
            if (col.pk) settings.push('pk');
            if (col.isUnique) settings.push('unique');
            if (!col.nullable) settings.push('not null');
            if (col.isAutoIncrement) settings.push('increment');
            if (col.defaultValue) {
                const isNumeric = /^\d+$/.test(col.defaultValue);
                settings.push(`default: ${isNumeric ? col.defaultValue : `'${col.defaultValue}'`}`);
            }
            if (col.comment) settings.push(`note: '${col.comment}'`);

            dbml += `  ${col.name} ${col.type}${settings.length > 0 ? ` [${settings.join(', ')}]` : ''}\n`;
        });
        dbml += '}\n\n';
    });

    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const sourceCol = sourceNode?.data.columns.find((c: any) => c.id === edge.sourceHandle);
        const targetCol = targetNode?.data.columns.find((c: any) => c.id === edge.targetHandle);

        if (sourceNode && targetNode && sourceCol && targetCol) {
            const symbol = getRelationshipSymbol(edge.data?.relationship);
            dbml += `Ref: ${sourceNode.data.label}.${sourceCol.name} ${symbol} ${targetNode.data.label}.${targetCol.name}\n`;
        }
    });

    return dbml;
}

export function parseDbml(dbmlString: string, existingNodes: Node[]): { nodes: Node[], edges: Edge[] } {
    const parser = new Parser();
    const database = parser.parse(dbmlString, 'dbml');
    const schema = database.schemas[0];

    const existingNodePositions = new Map(existingNodes.map(n => [n.data.label, n.position]));
    let newNodeY = 0;

    const nodes: Node[] = schema.tables.map((table, tableIndex) => {
        const position = existingNodePositions.get(table.name) || { x: 250, y: newNodeY };
        if (!existingNodePositions.has(table.name)) {
            newNodeY += 200;
        }

        const columns = table.fields.map((field, colIndex) => ({
            id: `col_${table.name}_${field.name}_${colIndex}`,
            name: field.name,
            type: field.type.type_name,
            pk: !!field.pk,
            nullable: !field.not_null,
            defaultValue: field.dbdefault?.value,
            isUnique: !!field.unique,
            isAutoIncrement: !!field.increment,
            comment: field.note?.value,
        }));

        return {
            id: `${table.name}-${+new Date()}`,
            type: 'table',
            position,
            data: {
                label: table.name,
                columns,
                comment: table.note?.value,
                order: tableIndex,
                color: tableColors[tableIndex % tableColors.length],
            },
        };
    });

    const edges: Edge[] = schema.refs.map((ref, index) => {
        const sourceEndpoint = ref.endpoints[0];
        const targetEndpoint = ref.endpoints[1];

        const sourceNode = nodes.find(n => n.data.label === sourceEndpoint.tableName);
        const targetNode = nodes.find(n => n.data.label === targetEndpoint.tableName);

        const sourceCol = sourceNode?.data.columns.find(c => c.name === sourceEndpoint.fieldNames[0]);
        const targetCol = targetNode?.data.columns.find(c => c.name === targetEndpoint.fieldNames[0]);

        if (!sourceNode || !targetNode || !sourceCol || !targetCol) return null;

        return {
            id: `edge-${index}`,
            source: sourceNode.id,
            target: targetNode.id,
            sourceHandle: sourceCol.id,
            targetHandle: targetCol.id,
            type: 'custom',
            data: {
                relationship: getRelationshipType(ref.token.value),
            },
        };
    }).filter((e): e is Edge => e !== null);

    return { nodes, edges };
}