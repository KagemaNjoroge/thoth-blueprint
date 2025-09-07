import Dexie, { type Table } from 'dexie';
import { type AppNode, type AppEdge } from './types';

export type DatabaseType = 'mysql' | 'postgres';

export interface Diagram {
  id?: number;
  name: string;
  dbType: DatabaseType;
  data: {
    nodes: AppNode[];
    edges: AppEdge[];
    viewport: any;
    isLocked?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class Database extends Dexie {
  diagrams!: Table<Diagram>; 

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
  }
}

export const db = new Database();