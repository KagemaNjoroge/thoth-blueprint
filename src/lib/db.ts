import Dexie, { type Table } from 'dexie';

export interface Diagram {
  id?: number;
  name: string;
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
  }
}

export const db = new Database();