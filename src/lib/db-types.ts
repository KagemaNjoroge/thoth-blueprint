import { DatabaseType } from './db';

export const postgresDataTypes = [
  "BIGINT", "BOOLEAN", "VARCHAR", "CHAR", "DATE", "DECIMAL", "DOUBLE PRECISION",
  "INTEGER", "JSON", "JSONB", "REAL", "SMALLINT", "TEXT", "TIME", "TIMESTAMP", "UUID", "XML"
];

export const mysqlDataTypes = [
  "INT", "VARCHAR", "TEXT", "DATE", "DATETIME", "TIMESTAMP", "TINYINT", "DECIMAL",
  "FLOAT", "DOUBLE", "JSON", "BLOB", "ENUM", "SET", "BOOLEAN"
];

export const dataTypes: Record<DatabaseType, string[]> = {
  postgres: postgresDataTypes,
  mysql: mysqlDataTypes,
};