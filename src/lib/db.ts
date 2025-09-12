import Dexie, { type Table } from 'dexie';
import { type AppNode, type AppEdge, type AppNoteNode } from './types';

export type DatabaseType = 'mysql' | 'postgres';

export interface Diagram {
  id?: number;
  name: string;
  dbType: DatabaseType;
  data: {
    nodes: AppNode[];
    edges: AppEdge[];
    notes?: AppNoteNode[];
    viewport: { x: number; y: number; zoom: number };
    isLocked?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface AppState {
  key: string;
  value: any;
}

export class Database extends Dexie {
  diagrams!: Table<Diagram>;
  appState!: Table<AppState>;

  constructor() {
    super('DatabaseDesignerDB');
    this.version(1).stores({
      diagrams: '++id, name, createdAt, updatedAt'
    });
    this.version(2).stores({
      diagrams: '++id, name, dbType, createdAt, updatedAt'
    }).upgrade(tx => {
      return tx.table('diagrams').toCollection().modify(diagram => {
        diagram.dbType = 'postgres'; // Default existing diagrams to postgres
      });
    });
    this.version(3).stores({}).upgrade(tx => {
        return tx.table('diagrams').toCollection().modify(diagram => {
            if (diagram.data && typeof diagram.data.isLocked === 'undefined') {
                diagram.data.isLocked = false;
            }
        });
    });
    this.version(4).stores({
      diagrams: '++id, name, dbType, createdAt, updatedAt, deletedAt'
    }).upgrade(tx => {
      return tx.table('diagrams').toCollection().modify(diagram => {
        diagram.deletedAt = null;
      });
    });
    this.version(5).stores({
      diagrams: '++id, name, dbType, createdAt, updatedAt, deletedAt',
      appState: 'key',
    });
    this.version(6).stores({}).upgrade(tx => {
        return tx.table('diagrams').toCollection().modify(diagram => {
            if (diagram.data && typeof diagram.data.notes === 'undefined') {
                diagram.data.notes = [];
            }
        });
    });
  }
}

export const db = new Database();