import { Diagram } from './db';
import { AppNode, Column } from './types';

const diagramToMermaid = (diagram: Diagram): string => {
    const { nodes, edges } = diagram.data;
    let mermaidString = 'erDiagram\n';

    // Tables and columns
    nodes.filter(n => !n.data.isDeleted).forEach((node: AppNode) => {
        const tableName = node.data.label.trim();
        mermaidString += `    "${tableName}" {\n`;
        node.data.columns.forEach((col: Column) => {
            const columnName = col.name.trim();
            const type = col.type.replace(/\s/g, '_'); // Mermaid doesn't like spaces in types
            const pk = col.pk ? ' PK' : '';
            const unique = col.isUnique ? ' UK' : '';

            const comments = [];
            if (col.nullable === false) {
                comments.push('NOT NULL');
            }
            if (col.comment) {
                // Sanitize comment to remove double quotes that would break the syntax
                const sanitizedComment = col.comment.replace(/"/g, "'");
                comments.push(sanitizedComment);
            }
            
            const commentString = comments.length > 0 ? ` "${comments.join(', ')}"` : '';
            
            mermaidString += `        ${type} "${columnName}"${pk}${unique}${commentString}\n`;
        });
        mermaidString += `    }\n\n`;
    });

    // Relationships
    edges.forEach((edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
            const sourceTableName = sourceNode.data.label.trim();
            const targetTableName = targetNode.data.label.trim();
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
            
            mermaidString += `    "${sourceTableName}" ${relationshipSymbol} "${targetTableName}" : ""\n`;
        }
    });

    return mermaidString;
};

export const exportToMermaid = (diagram: Diagram): string => {
    return diagramToMermaid(diagram);
};