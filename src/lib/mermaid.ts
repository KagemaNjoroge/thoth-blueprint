import { Diagram } from './db';
import { AppNode, Column } from './types';

const diagramToMermaid = (diagram: Diagram): string => {
    const { nodes, edges } = diagram.data;
    let mermaidString = 'erDiagram\n';

    // Tables and columns
    nodes.filter(n => !n.data.isDeleted).forEach((node: AppNode) => {
        mermaidString += `    ${node.data.label} {\n`;
        node.data.columns.forEach((col: Column) => {
            const type = col.type.replace(/\s/g, '_'); // Mermaid doesn't like spaces in types
            const pk = col.pk ? ' PK' : '';
            const unique = col.isUnique ? ' UK' : ''; // Mermaid uses UK for unique keys
            const notNull = col.nullable === false ? ' "NN"' : ''; // Using comment for NOT NULL
            const comment = col.comment ? ` "${col.comment}"` : '';
            
            mermaidString += `        ${type} ${col.name}${pk}${unique}${notNull}${comment}\n`;
        });
        mermaidString += `    }\n\n`;
    });

    // Relationships
    edges.forEach((edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
            let relationshipSymbol = '';
            switch (edge.data?.relationship) {
                case 'one-to-one':
                    relationshipSymbol = '||--||';
                    break;
                case 'one-to-many':
                    relationshipSymbol = '||--o{';
                    break;
                case 'many-to-one':
                    relationshipSymbol = '}o--||';
                    break;
                case 'many-to-many':
                    relationshipSymbol = '}o--o{';
                    break;
                default:
                    relationshipSymbol = '||--o{'; // Default to one-to-many
            }
            
            mermaidString += `    ${sourceNode.data.label} ${relationshipSymbol} ${targetNode.data.label} : ""\n`;
        }
    });

    return mermaidString;
};

export const exportToMermaid = (diagram: Diagram): string => {
    return diagramToMermaid(diagram);
};