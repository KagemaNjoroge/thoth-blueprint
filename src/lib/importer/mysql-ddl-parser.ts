import { tableColors } from "@/lib/colors";
import { DbRelationship } from "@/lib/constants";
import {
  type AppEdge,
  type AppNode,
  type Column,
  type Diagram,
  type Index,
} from "@/lib/types";

interface ParsedForeignKey {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName: string;
}

export function parseMySqlDdl(ddl: string): Diagram["data"] {
  const nodes: AppNode[] = [];
  const foreignKeys: ParsedForeignKey[] = [];

  // Remove comments and split into statements
  const statements = ddl
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toUpperCase().startsWith("CREATE TABLE"));

  statements.forEach((statement, statementIndex) => {
    const tableNameMatch = statement.match(/CREATE TABLE\s+`?(\w+)`?/i);
    if (!tableNameMatch) return;

    const tableName = tableNameMatch[1];
    const columns: Column[] = [];
    const indices: Index[] = [];
    let tableComment = "";

    const tableBodyMatch = statement.match(/\(([\s\S]*)\)/);
    if (!tableBodyMatch) return;

    const tableBody = tableBodyMatch[1] || '';
    const lines = tableBody
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/,$/, ""));

    lines.forEach((line) => {
      if (!line) return;

      // Skip constraint definitions
      if (
        /^(PRIMARY|CONSTRAINT|UNIQUE|KEY|INDEX|FULLTEXT|SPATIAL)/i.test(line)
      ) {
        // Handle PRIMARY KEY constraint
        if (line.toUpperCase().startsWith("PRIMARY KEY")) {
          const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
          if (pkMatch) {
            const pkCols = (pkMatch[1] || '')
              .replace(/`/g, "")
              .split(",")
              .map((c) => c.trim());
            columns.forEach((c) => {
              if (pkCols.includes(c.name)) {
                c.pk = true;
                c.nullable = false; // PKs are always NOT NULL
              }
            });
          }
        }
        // Handle UNIQUE KEY / KEY / INDEX
        else if (/^(UNIQUE\s+)?(KEY|INDEX)/i.test(line)) {
          const indexMatch = line.match(
            /(?:UNIQUE\s+)?(?:KEY|INDEX)\s+(?:`?(\w+)`?\s+)?\(([^)]+)\)/i
          );
          if (indexMatch) {
            const indexName = indexMatch[1] || `idx_${Date.now()}`;
            const indexColsStr = indexMatch[2];
            const isUnique = /^UNIQUE/i.test(line);

            const indexColNames = (indexColsStr || '')
              .replace(/`/g, "")
              .split(",")
              .map((c) => c?.trim()?.split("(")[0]?.split(" ")[0]);

            const indexColIds = indexColNames
              .map((name) => columns.find((c) => c.name === name)?.id)
              .filter((id): id is string => id !== undefined);

            if (indexColIds.length > 0) {
              indices.push({
                id: `idx_${tableName}_${indexName}_${Date.now()}`,
                name: indexName,
                columns: indexColIds,
                isUnique,
              });
            }
          }
        }
        // Handle FOREIGN KEY constraint
        else if (/^CONSTRAINT.*FOREIGN\s+KEY/i.test(line)) {
          const fkMatch = line.match(
            /CONSTRAINT\s+`?(\w+)`?\s+FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s+REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i
          );
          if (fkMatch) {
            const [, constraintName, sourceColumn, targetTable, targetColumn] =
              fkMatch;
            foreignKeys.push({
              sourceTable: tableName || '',
              sourceColumn: sourceColumn || '',
              targetTable: targetTable || '',
              targetColumn: targetColumn || '',
              constraintName: constraintName || '',
            });
          }
        }
        return;
      }

      // Parse column definition
      const colMatch = line.match(
        /^`?(\w+)`?\s+(\w+(?:\([^)]+\))?(?:\s+(?:UNSIGNED|ZEROFILL))*)(.*)/i
      );
      if (!colMatch) return;

      const name = colMatch[1] || '';
      const typeString = (colMatch[2] || '').trim();
      const rest = (colMatch[3] || '').trim();

      const [type, length, precision, scale] = parseType(typeString);

      // Parse constraints more carefully
      const isNotNull = /\bNOT\s+NULL\b/i.test(rest);
      const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
      const isAutoIncrement = /\bAUTO_INCREMENT\b/i.test(rest);
      const isUnique = /\bUNIQUE\b/i.test(rest);
      const isUnsigned = /\bUNSIGNED\b/i.test(typeString);

      // Extract default value
      let defaultValue: string | number | null | undefined;
      const defaultMatch = rest.match(
        /\bDEFAULT\s+(?:'([^']*(?:''[^']*)*)'|(NULL)|([^\s,]+))/i
      );
      if (defaultMatch) {
        if (defaultMatch[2]) {
          defaultValue = null; // NULL
        } else if (defaultMatch[1]) {
          defaultValue = defaultMatch[1].replace(/''/g, "'"); // Handle escaped quotes
        } else if (defaultMatch[3]) {
          const val = defaultMatch[3];
          // Try to parse as number
          if (/^-?\d+(\.\d+)?$/.test(val)) {
            defaultValue = parseFloat(val);
          } else {
            defaultValue = val; // Function or keyword
          }
        }
      }

      // Extract comment
      const commentMatch = rest.match(/\bCOMMENT\s+'([^']*)'/i);
      const comment = commentMatch?.[1];

      const column: Column = {
        id: `col_${tableName}_${name}_${Date.now()}_${Math.random()}`,
        name,
        type,
        length,
        precision,
        scale,
        nullable: !isNotNull && !isPrimaryKey, // PKs are implicitly NOT NULL
        pk: isPrimaryKey,
        isAutoIncrement,
        isUnique,
        isUnsigned,
        defaultValue,
        comment,
      };
      columns.push(column);
    });

    // Extract table comment
    const tableOptionsMatch = statement.match(/\)\s*(.*)$/i);
    if (tableOptionsMatch) {
      const tableOptions = tableOptionsMatch[1];
      const commentMatch = tableOptions?.match(/\bCOMMENT\s*=?\s*'([^']*)'/i);
      if (commentMatch) {
        tableComment = commentMatch[1] || '';
      }
    }

    nodes.push({
      id: `node_${tableName}_${Date.now()}`,
      type: "table",
      position: {
        x: (statementIndex % 4) * 320,
        y: Math.floor(statementIndex / 4) * 250,
      },
      data: {
        label: tableName || '',
        columns,
        indices,
        comment: tableComment,
        color: tableColors[statementIndex % tableColors.length] || '',
        order: statementIndex,
      },
    });
  });

  const edges: AppEdge[] = foreignKeys
    .flatMap((fk) => {
      const sourceNode = nodes.find((n) => n.data.label === fk.sourceTable);
      const targetNode = nodes.find((n) => n.data.label === fk.targetTable);

      if (!sourceNode || !targetNode) return [];

      const sourceColumn = sourceNode.data.columns.find(
        (c) => c.name === fk.sourceColumn
      );
      const targetColumn = targetNode.data.columns.find(
        (c) => c.name === fk.targetColumn
      );

      if (!sourceColumn || !targetColumn) return [];

      return [{
        id: `edge_${fk.constraintName}`,
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: `${sourceColumn.id}-right-source`,
        targetHandle: `${targetColumn.id}-left-target`,
        type: "custom",
        data: {
          relationship: DbRelationship.MANY_TO_ONE,
        },
      }];
    });

  return {
    nodes,
    edges,
    notes: [],
    zones: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    isLocked: false,
  };
}

function parseType(
  typeString: string
): [string, number | undefined, number | undefined, number | undefined] {
  // Remove UNSIGNED, ZEROFILL etc from type string for parsing
  const cleanType = typeString.replace(/\s+(UNSIGNED|ZEROFILL)/gi, "");

  const typeMatch = cleanType.match(/^(\w+)(?:\(([^)]+)\))?/i);
  if (!typeMatch) {
    return [typeString.toUpperCase(), undefined, undefined, undefined];
  }

  const type = (typeMatch[1] || "").toUpperCase();
  const paramsStr = typeMatch[2];

  if (!paramsStr) {
    return [type, undefined, undefined, undefined];
  }

  // Handle ENUM/SET with quoted values
  if (type === "ENUM" || type === "SET") {
    return [type, undefined, undefined, undefined];
  }

  // Parse numeric parameters
  const params = paramsStr
    .split(",")
    .map((p) => {
      const num = parseInt(p.trim(), 10);
      return isNaN(num) ? undefined : num;
    })
    .filter((p): p is number => p !== undefined);

  if (params.length === 2) {
    // DECIMAL(p, s) or DOUBLE(p, s)
    return [type, undefined, params[0], params[1]];
  }
  if (params.length === 1) {
    // VARCHAR(l) or INT(l)
    return [type, params[0], undefined, undefined];
  }

  return [type, undefined, undefined, undefined];
}
