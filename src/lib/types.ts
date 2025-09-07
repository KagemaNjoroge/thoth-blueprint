import { type Node, type Edge } from '@xyflow/react';

export interface Column {
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
    length?: number;
    precision?: number;
    scale?: number;
    isUnsigned?: boolean;
}

export interface Index {
    id: string;
    name: string;
    columns: string[];
    isUnique?: boolean;
}

export interface TableNodeData {
    label: string;
    columns: Column[];
    indices?: Index[];
    comment?: string;
    color?: string;
    isDeleted?: boolean;
    deletedAt?: Date;
    order?: number;
}

export interface EdgeData {
    relationship: string;
    isHighlighted?: boolean;
}

export type AppNode = Node<TableNodeData, 'table'>;
export type AppEdge = Edge<EdgeData>;