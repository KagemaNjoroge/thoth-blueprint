import { type Node, type Edge } from '@xyflow/react';

export interface Column {
    id: string;
    name: string;
    type: string;
    pk?: boolean | undefined;
    nullable?: boolean | undefined;
    defaultValue?: string | number | boolean | null | undefined;
    isUnique?: boolean | undefined;
    isAutoIncrement?: boolean | undefined;
    comment?: string | undefined;
    enumValues?: string | undefined;
    length?: number | undefined;
    precision?: number | undefined;
    scale?: number | undefined;
    isUnsigned?: boolean | undefined;
}

export interface Index {
    id: string;
    name: string;
    columns: string[];
    isUnique?: boolean;
}

export interface TableNodeData extends Record<string, unknown> {
    label: string;
    columns: Column[];
    indices?: Index[];
    comment?: string;
    color?: string;
    isDeleted?: boolean;
    deletedAt?: Date;
    order?: number;
}

export interface NoteNodeData extends Record<string, unknown> {
    text: string;
    color?: string;
    onUpdate?: (id: string, data: Partial<NoteNodeData>) => void;
    onDelete?: (ids: string[]) => void;
}

export interface ZoneNodeData extends Record<string, unknown> {
    name: string;
    color?: string;
    onUpdate?: (id: string, data: Partial<ZoneNodeData>) => void;
    onDelete?: (ids: string[]) => void;
}

export interface EdgeData extends Record<string, unknown> {
    relationship: string;
    isHighlighted?: boolean;
}

export type AppNode = Node<TableNodeData, 'table'>;
export type AppNoteNode = Node<NoteNodeData, 'note'>;
export type AppZoneNode = Node<ZoneNodeData, 'zone'>;
export type AppEdge = Edge<EdgeData>;