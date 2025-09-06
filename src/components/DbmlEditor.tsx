import { useState, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { dbml } from 'codemirror-lang-dbml';
import { Diagram } from '@/lib/db';
import { generateDbml, parseDbml } from '@/lib/dbml';
import { Button } from './ui/button';
import { GitBranch, AlertTriangle } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { Node, Edge } from 'reactflow';
import { showError } from '@/utils/toast';
import { ScrollArea } from './ui/scroll-area';

interface DbmlEditorProps {
    diagram: Diagram;
    onDiagramUpdate: (data: { nodes: Node[], edges: Edge[] }) => void;
    isLocked: boolean;
}

export default function DbmlEditor({ diagram, onDiagramUpdate, isLocked }: DbmlEditorProps) {
    const [code, setCode] = useState('');
    const [debouncedDiagram] = useDebounce(diagram, 300);

    useEffect(() => {
        if (debouncedDiagram) {
            setCode(generateDbml(debouncedDiagram));
        }
    }, [debouncedDiagram]);

    const handleCodeChange = useCallback((value: string) => {
        setCode(value);
    }, []);

    const handleUpdateDiagram = () => {
        try {
            const { nodes, edges } = parseDbml(code, diagram.data.nodes);
            onDiagramUpdate({ nodes, edges });
        } catch (error: any) {
            console.error("DBML Parsing Error:", error);
            showError(`Invalid DBML: ${error.message}`);
        }
    };

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex-grow relative">
                <ScrollArea className="absolute inset-0">
                    <CodeMirror
                        value={code}
                        height="100%"
                        extensions={[dbml()]}
                        onChange={handleCodeChange}
                        readOnly={isLocked}
                        theme="dark"
                        className="h-full"
                    />
                </ScrollArea>
            </div>
            <div className="flex-shrink-0 pt-4">
                {isLocked ? (
                    <div className="flex items-center text-sm text-yellow-600 bg-yellow-100 p-2 rounded-md">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Diagram is locked. Unlock to edit DBML and update.
                    </div>
                ) : (
                    <Button onClick={handleUpdateDiagram} className="w-full">
                        <GitBranch className="h-4 w-4 mr-2" />
                        Update Diagram from DBML
                    </Button>
                )}
            </div>
        </div>
    );
}