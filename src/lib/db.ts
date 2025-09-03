import Dexie, { type Table } from 'dexie';

export type DatabaseType = 'mysql' | 'postgres';

export interface Diagram {
  id?: number;
  name: string;
  dbType: DatabaseType;
  data: {
    nodes: any[];
    edges: any[];
    viewport: any;
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
  }
}

export const db = new Database();