import { tableColors } from "@/lib/colors";
import { DbRelationship } from "@/lib/constants";
import { organizeTablesByRelationships } from "@/lib/layout-algorithms";
import {
  type AppEdge,
  type AppNode,
  type AppNoteNode,
  type Column,
  type Diagram,
  type Index,
  // type IndexType,
  type EdgeData,
} from "@/lib/types";

interface ParsedForeignKey {
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  constraintName: string;
  onDelete?: string;
  onUpdate?: string;
}

// interface ParsedEnumType {
//   name: string;
//   values: string[];
// }

interface Diagnostic {
  level: "warning" | "error";
  message: string;
  table?: string;
  detail?: string;
}

function uuid(): string {
  try {
    // Prefer Web Crypto API
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore crypto.randomUUID() errors, fallback will be used
  }
  // Fallback
  return `uuid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function stripComments(sql: string): string {
  // Robust comment stripping that respects quotes and PostgreSQL variants.
  // - Removes '--' single-line comments (outside quotes)
  // - Removes standard block comments '/* ... */' (outside quotes)
  // - Preserves dollar-quoted strings
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarQuoteTag = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Handle dollar-quoted strings (PostgreSQL specific)
    if (!inSingle && !inDouble && !inLineComment && !inBlockComment) {
      if (ch === "$" && !dollarQuoteTag) {
        // Look for dollar quote tag like $tag$ or just $$
        let tagEnd = i + 1;
        while (tagEnd < sql.length && /[a-zA-Z0-9_]/.test(sql[tagEnd] || "")) {
          tagEnd++;
        }
        if (tagEnd < sql.length && sql[tagEnd] === "$") {
          dollarQuoteTag = sql.slice(i, tagEnd + 1);
          out += dollarQuoteTag;
          i = tagEnd + 1;
          continue;
        }
      } else if (dollarQuoteTag && sql.slice(i, i + dollarQuoteTag.length) === dollarQuoteTag) {
        out += dollarQuoteTag;
        i += dollarQuoteTag.length;
        dollarQuoteTag = "";
        continue;
      }
    }

    // Handle dollar-quoted content
    if (dollarQuoteTag) {
      out += ch;
      i++;
      continue;
    }

    // End line comment on newline
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        out += ch;
      }
      i++;
      continue;
    }

    // End block comment
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2; // skip */
        continue;
      }
      i++;
      continue;
    }

    // Toggle quotes when not in comments
    if (!inLineComment && !inBlockComment) {
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
      }
    }

    // Start comments only when not inside quotes
    if (!inSingle && !inDouble) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i += 2;
        continue;
      }
    }

    // Normal character
    out += ch;
    i++;
  }

  return out;
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let dollarQuoteTag = "";
  let i = 0;

  const pushCurrent = () => {
    const s = current.trim();
    if (s.length) statements.push(s);
    current = "";
  };

  while (i < sql.length) {
    const ch = sql[i];
    // const next = sql[i + 1];

    // Handle dollar-quoted strings
    if (!inSingle && !inDouble && !dollarQuoteTag) {
      if (ch === "$") {
        let tagEnd = i + 1;
        while (tagEnd < sql.length && /[a-zA-Z0-9_]/.test(sql[tagEnd] || "")) {
          tagEnd++;
        }
        if (tagEnd < sql.length && sql[tagEnd] === "$") {
          dollarQuoteTag = sql.slice(i, tagEnd + 1);
          i = tagEnd + 1;
          continue;
        }
      }
    } else if (dollarQuoteTag && sql.slice(i, i + dollarQuoteTag.length) === dollarQuoteTag) {
      dollarQuoteTag = "";
      i += dollarQuoteTag.length;
      continue;
    }

    if (dollarQuoteTag) {
      current += ch;
      i++;
      continue;
    }

    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === "(") depth++;
      else if (ch === ")" && depth > 0) depth--;
    }

    if (ch === ";" && !inSingle && !inDouble && depth === 0 && !dollarQuoteTag) {
      pushCurrent();
    } else {
      current += ch;
    }
    i++;
  }

  pushCurrent();

  // Keep only CREATE TABLE and CREATE TYPE statements
  return statements.filter((s) => /^\s*CREATE\s+(TABLE|TYPE)/i.test(s));
}

function normalizeIdentifier(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  // If quoted with double quotes, take literal content (PostgreSQL standard)
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  // If quoted with single quotes (rare), strip
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  // If schema-qualified, take the last segment
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    const lastPart = parts[parts.length - 1];
    return lastPart ? normalizeIdentifier(lastPart) : "";
  }
  return trimmed;
}

function splitTopLevelItems(body: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let dollarQuoteTag = "";
  let i = 0;

  while (i < body.length) {
    const ch = body[i];
    // const next = body[i + 1];

    // Handle dollar-quoted strings
    if (!inSingle && !inDouble && !dollarQuoteTag) {
      if (ch === "$") {
        let tagEnd = i + 1;
        while (tagEnd < body.length && /[a-zA-Z0-9_]/.test(body[tagEnd] || "")) {
          tagEnd++;
        }
        if (tagEnd < body.length && body[tagEnd] === "$") {
          dollarQuoteTag = body.slice(i, tagEnd + 1);
          i = tagEnd + 1;
          continue;
        }
      }
    } else if (dollarQuoteTag && body.slice(i, i + dollarQuoteTag.length) === dollarQuoteTag) {
      dollarQuoteTag = "";
      i += dollarQuoteTag.length;
      continue;
    }

    if (dollarQuoteTag) {
      current += ch;
      i++;
      continue;
    }

    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === "(") depth++;
      else if (ch === ")" && depth > 0) depth--;
    }

    if (ch === "," && !inSingle && !inDouble && depth === 0 && !dollarQuoteTag) {
      const item = current.trim();
      if (item.length) items.push(item);
      current = "";
    } else {
      current += ch;
    }
    i++;
  }
  const last = current.trim();
  if (last.length) items.push(last);
  return items;
}

function parseQuotedList(listStr: string): string[] {
  // Expect input like: 'a','b','c' or "a","b"
  const result: string[] = [];
  let token = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < listStr.length; i++) {
    const ch = listStr[i];
    const prev = listStr[i - 1];
    const isEscaped = prev === "\\";

    if (!isEscaped) {
      if (ch === "'" && !inDouble) {
        if (inSingle) {
          // end token
          result.push(token);
          token = "";
          inSingle = false;
          // skip next comma if any
          continue;
        } else {
          inSingle = true;
          continue;
        }
      } else if (ch === '"' && !inSingle) {
        if (inDouble) {
          result.push(token);
          token = "";
          inDouble = false;
          continue;
        } else {
          inDouble = true;
          continue;
        }
      }
    }

    if (inSingle || inDouble) {
      token += ch;
    }
  }

  return result.map((s) => s.replace(/''/g, "'"));
}

function extractEnumTypes(sql: string): Map<string, string[]> {
  const enumMap = new Map<string, string[]>();
  const enumRegex = /CREATE\s+TYPE\s+([^\s]+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  
  let match;
  while ((match = enumRegex.exec(sql)) !== null) {
    const enumName = normalizeIdentifier(match[1] || "");
    const valuesStr = match[2] || "";
    const values = parseQuotedList(valuesStr);
    enumMap.set(enumName, values);
  }
  
  return enumMap;
}

export async function parsePostgreSqlDdlAsync(
  ddl: string,
  onProgress?: (progress: number, label?: string) => void,
  reorganizeAfterImport: boolean = false
): Promise<Diagram["data"]> {
  const diagnostics: Diagnostic[] = [];
  const nodes: AppNode[] = [];
  const foreignKeys: ParsedForeignKey[] = [];

  // First pass: extract enum types
  const enumTypes = extractEnumTypes(ddl);
  
  const cleaned = stripComments(ddl);
  const statements = splitStatements(cleaned);
  const tableStatements = statements.filter(s => /^\s*CREATE\s+TABLE/i.test(s));
  const total = tableStatements.length || 1;

  // adaptive layout parameters for optimized space utilization
  const totalTables = tableStatements.length;
  const NUM_COLUMNS = Math.min(Math.max(Math.ceil(Math.sqrt(totalTables * 1.5)), 4), 8);
  const CARD_WIDTH = 288;
  const X_GAP = 32;
  const Y_GAP = 32;
  const columnYOffset: number[] = Array(NUM_COLUMNS).fill(20);
  const estimateHeight = (columnCount: number) => 60 + columnCount * 28;
  
  // Helper function to find the column with minimum height for balanced layout
  const findMinHeightColumn = () => {
    let minHeight = columnYOffset[0] ?? 0;
    let minIndex = 0;
    for (let i = 1; i < NUM_COLUMNS; i++) {
      const height = columnYOffset[i] ?? 0;
      if (height < minHeight) {
        minHeight = height;
        minIndex = i;
      }
    }
    return minIndex;
  };

  for (let statementIndex = 0; statementIndex < tableStatements.length; statementIndex++) {
    const statement = tableStatements[statementIndex];

    // Table name
    const tableNameMatch = statement?.match(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i);
    if (!tableNameMatch) {
      diagnostics.push({ level: "warning", message: "Unable to parse table name", detail: statement?.slice(0, 120) || "" });
      continue;
    }

    const rawTableName = tableNameMatch[2];
    const tableName = normalizeIdentifier(rawTableName ?? "");

    const columns: Column[] = [];
    const indices: Index[] = [];
    let tableComment = "";

    const tableBodyMatch = statement?.match(/\(([\s\S]*)\)/);
    if (!tableBodyMatch) {
      diagnostics.push({ level: "warning", message: "Missing table body", table: tableName });
      continue;
    }

    const tableBody = tableBodyMatch[1] || "";
    const items = splitTopLevelItems(tableBody);

    items.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      // Handle PRIMARY KEY
      if (/^PRIMARY\s+KEY/i.test(line)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          const pkCols = (pkMatch[1] || "")
            .split(",")
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.trim() ?? ""))
            .filter(Boolean);
          columns.forEach((c) => {
            if (pkCols.includes(c.name)) {
              c.pk = true;
              c.nullable = false;
            }
          });
        }
        return;
      }

      // Handle UNIQUE constraints
      if (/^CONSTRAINT\s+[^\s]+\s+UNIQUE/i.test(line) || /^UNIQUE/i.test(line)) {
        let constraintName = "";
        let columnsStr = "";
        
        const namedUniqueMatch = line.match(/CONSTRAINT\s+`?([^`\s]+)`?\s+UNIQUE\s*\(([^)]+)\)/i);
        if (namedUniqueMatch) {
          constraintName = normalizeIdentifier(namedUniqueMatch[1] || "");
          columnsStr = namedUniqueMatch[2] || "";
        } else {
          const simpleUniqueMatch = line.match(/UNIQUE\s*\(([^)]+)\)/i);
          if (simpleUniqueMatch) {
            constraintName = `uq_${tableName}_${uuid().slice(0, 8)}`;
            columnsStr = simpleUniqueMatch[1] || "";
          }
        }

        if (columnsStr) {
          const colNames = columnsStr
            .split(",")
            .map((c) => normalizeIdentifier(c.trim()))
            .filter(Boolean);

          const colIds = colNames
            .map((n) => columns.find((c) => c.name === n)?.id)
            .filter((id): id is string => !!id);

          if (colIds.length > 0) {
            indices.push({
              id: uuid(),
              name: constraintName,
              columns: colIds,
              isUnique: true,
              type: "UNIQUE",
            });
          }
        }
        return;
      }

      // Handle FOREIGN KEY constraints
      if (/^(CONSTRAINT\s+[^\s]+\s+)?FOREIGN\s+KEY/i.test(line)) {
        const namedFkMatch = line.match(/CONSTRAINT\s+`?([^`\s]+)`?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
        const simpleFkMatch = !namedFkMatch
          ? line.match(/FOREIGN\s+KEY\s*(?:`?([^`\s]+)`?\s*)?\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i)
          : null;
        const m = namedFkMatch || simpleFkMatch;
        if (m) {
          const constraintName = normalizeIdentifier(m[1] || `fk_${tableName}_${uuid().slice(0, 8)}`);
          const sourceCols = (m[2] ?? "")
            .split(",")
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.trim() ?? ""))
            .filter(Boolean);
          const targetTbl = normalizeIdentifier(m[3] ?? "");
          const targetCols = (m[4] ?? "")
            .split(",")
            .map((c) => normalizeIdentifier(c.split(" ")[0]?.trim() ?? ""))
            .filter(Boolean);

          let onDelete: string | undefined;
          let onUpdate: string | undefined;
          const delMatch = line.match(/ON\s+DELETE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          const updMatch = line.match(/ON\s+UPDATE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          if (delMatch && delMatch[1]) onDelete = delMatch[1].toUpperCase().replace(/\s+/g, " ");
          if (updMatch && updMatch[1]) onUpdate = updMatch[1].toUpperCase().replace(/\s+/g, " ");

          const fkObj: ParsedForeignKey = {
            sourceTable: tableName,
            sourceColumns: sourceCols,
            targetTable: targetTbl,
            targetColumns: targetCols,
            constraintName,
          };
          if (onDelete) fkObj.onDelete = onDelete;
          if (onUpdate) fkObj.onUpdate = onUpdate;

          foreignKeys.push(fkObj);
        }
        return;
      }

      // Handle CHECK constraints (skip for now, but could be parsed)
      if (/^CONSTRAINT\s+[^\s]+\s+CHECK/i.test(line) || /^CHECK/i.test(line)) {
        // Skip CHECK constraints for now
        return;
      }

      // Handle column definitions
      const colMatch = line.match(/^`?([^`\s]+)`?\s+([^(\s]+(?:\([^)]+\))?)(.*)$/i);
      if (!colMatch) return;

      const name = normalizeIdentifier(colMatch[1] || "");
      const typeString = (colMatch[2] || "").trim();
      const rest = (colMatch[3] || "").trim();

      const [type, length, precision, scale] = parsePostgreSqlType(typeString);

      const isNotNull = /\bNOT\s+NULL\b/i.test(rest);
      const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
      const isAutoIncrement = /\bSERIAL\b/i.test(typeString) || /\bBIGSERIAL\b/i.test(typeString) || /\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY\b/i.test(rest);
      const isUnique = /\bUNIQUE\b/i.test(rest);

      let defaultValue: string | number | null | undefined;
      const defaultMatch = rest.match(/\bDEFAULT\s+(?:'([^']*(?:''[^']*)*)'|(NULL)|([^(\s,]+(?:\([^)]*\))?))/i);
      if (defaultMatch) {
        if (defaultMatch[2]) defaultValue = null;
        else if (defaultMatch[1]) defaultValue = defaultMatch[1].replace(/''/g, "'");
        else if (defaultMatch[3]) {
          const val = defaultMatch[3];
          if (/^-?\d+(\.\d+)?$/.test(val)) defaultValue = parseFloat(val);
          else defaultValue = val;
        }
      }

      const commentMatch = rest.match(/\bCOMMENT\s*'([^']*)'/i);
      const comment = commentMatch?.[1] || "";

      // Check if this type is an enum type
      let enumValues: string | undefined;
      if (enumTypes.has(type)) {
        enumValues = enumTypes.get(type)?.join(",") || "";
      }

      const column: Column = {
        id: uuid(),
        name,
        type,
        length: length || 0,
        precision: precision || 0,
        scale: scale || 0,
        nullable: !isNotNull && !isPrimaryKey,
        pk: isPrimaryKey,
        isAutoIncrement,
        isUnique,
        isUnsigned: false, // PostgreSQL doesn't have UNSIGNED
        defaultValue,
        comment,
      };
      if (enumValues) column.enumValues = enumValues;
      columns.push(column);

      // Handle inline REFERENCES (less common in PostgreSQL but possible)
      if (/\bREFERENCES\b/i.test(rest)) {
        const refMatch = rest.match(/REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (refMatch) {
          const targetTbl = normalizeIdentifier(refMatch[1] || "");
          const targetCol = normalizeIdentifier(refMatch[2]?.split(",")[0] || "");
          let onDelete: string | undefined;
          let onUpdate: string | undefined;
          const delMatch = rest.match(/ON\s+DELETE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          const updMatch = rest.match(/ON\s+UPDATE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION)/i);
          if (delMatch && delMatch[1]) onDelete = delMatch[1].toUpperCase().replace(/\s+/g, " ");
          if (updMatch && updMatch[1]) onUpdate = updMatch[1].toUpperCase().replace(/\s+/g, " ");

          const fkObj: ParsedForeignKey = {
            sourceTable: tableName,
            sourceColumns: [name],
            targetTable: targetTbl,
            targetColumns: [targetCol],
            constraintName: `fk_${tableName}_${name}`,
          };
          if (onDelete) fkObj.onDelete = onDelete;
          if (onUpdate) fkObj.onUpdate = onUpdate;

          foreignKeys.push(fkObj);
        }
      }
    });

    // Extract table comment from PostgreSQL table options
    const tableOptionsMatch = statement?.match(/\)\s*WITH\s*\([^)]*\)|\)\s*INHERITS/i);
    if (tableOptionsMatch) {
      // PostgreSQL doesn't have table comments in CREATE TABLE like MySQL
      // Comments are added separately with COMMENT ON TABLE
      tableComment = "";
    }

    const colIndex = findMinHeightColumn();
    const x = colIndex * (CARD_WIDTH + X_GAP);
    const y = columnYOffset[colIndex] ?? 0;

    const node: AppNode = {
      id: uuid(),
      type: "table",
      position: { x, y },
      data: {
        label: tableName,
        columns,
        indices,
        comment: tableComment,
        color: tableColors[statementIndex % tableColors.length] || "",
        order: statementIndex,
      },
    };
    nodes.push(node);
    columnYOffset[colIndex] = (columnYOffset[colIndex] ?? 0) + estimateHeight(columns.length) + Y_GAP;

    if (onProgress) {
      const pct = Math.round(((statementIndex + 1) / total) * 100);
      onProgress(pct, `Parsed ${statementIndex + 1}/${total} tables`);
    }
    // Yield to the event loop to keep UI responsive
    await new Promise((r) => setTimeout(r, 0));
  }

  const tableMap = new Map<string, AppNode>();
  nodes.forEach((n) => tableMap.set(n.data.label, n));

  const edges: AppEdge[] = foreignKeys.flatMap((fk) => {
    const sourceNode = tableMap.get(fk.sourceTable);
    const targetNode = tableMap.get(fk.targetTable);
    if (!sourceNode || !targetNode) {
      diagnostics.push({ level: "warning", message: "FK references unknown table", detail: `${fk.sourceTable} -> ${fk.targetTable}` });
      return [];
    }

    const sourceCols = fk.sourceColumns
      .map((name) => sourceNode.data.columns.find((c) => c.name === name))
      .filter((c): c is Column => !!c);
    const targetCols = fk.targetColumns
      .map((name) => targetNode.data.columns.find((c) => c.name === name))
      .filter((c): c is Column => !!c);

    if (sourceCols.length !== fk.sourceColumns.length || targetCols.length !== fk.targetColumns.length) {
      diagnostics.push({ level: "warning", message: "FK columns not found", detail: fk.constraintName });
      return [];
    }

    const relationship = determineRelationshipComposite(sourceCols, targetCols, sourceNode, targetNode);

    const edgeList: AppEdge[] = [];
    const pairCount = Math.min(sourceCols.length, targetCols.length);
    for (let i = 0; i < pairCount; i++) {
      const sc = sourceCols[i];
      const tc = targetCols[i];
      const edgeData: EdgeData = {
        relationship,
        constraintName: fk.constraintName,
        sourceColumns: fk.sourceColumns,
        targetColumns: fk.targetColumns,
        isComposite: fk.sourceColumns.length > 1 || fk.targetColumns.length > 1,
        ...(fk.onDelete ? { onDelete: fk.onDelete } : {}),
        ...(fk.onUpdate ? { onUpdate: fk.onUpdate } : {}),
      };
      edgeList.push({
        id: uuid(),
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: `${sc?.id}-right-source`,
        targetHandle: `${tc?.id}-left-target`,
        type: "custom",
        data: edgeData,
      });
    }

    return edgeList;
  });

  const notes: AppNoteNode[] = [];
  if (diagnostics.length > 0) {
    const text = diagnostics
      .map((d) => `${d.level.toUpperCase()}: ${d.message}${d.table ? ` [${d.table}]` : ""}${d.detail ? ` - ${d.detail}` : ""}`)
      .join("\n");
    notes.push({ id: uuid(), type: "note", position: { x: 20, y: 20 }, data: { text, color: "#fde68a" } });
  }

  let finalResult = { nodes, edges, notes, zones: [], viewport: { x: 0, y: 0, zoom: 1 }, isLocked: false };

  // Apply relationship-based reorganization if requested
  if (reorganizeAfterImport && nodes.length > 0) {
    const organizedNodes = organizeTablesByRelationships(nodes, edges);
    finalResult = { ...finalResult, nodes: organizedNodes };
  }

  return finalResult;
}

function determineRelationshipComposite(
  sourceColumns: Column[],
  targetColumns: Column[],
  sourceTable: AppNode,
  targetTable: AppNode
): string {
  const sourceIds = new Set(sourceColumns.map((c) => c.id));
  const targetIds = new Set(targetColumns.map((c) => c.id));

  const hasUniqueIndexFor = (node: AppNode, ids: Set<string>): boolean => {
    const indices = node.data.indices || [];
    return indices.some((idx) => {
      if (!idx.isUnique) return false;
      if (idx.columns.length !== ids.size) return false;
      return idx.columns.every((cid) => ids.has(cid));
    });
  };

  const isSourceUnique =
    (sourceColumns.length === 1 && (sourceColumns[0]?.isUnique || sourceColumns[0]?.pk)) ||
    hasUniqueIndexFor(sourceTable, sourceIds);

  const isTargetUnique =
    (targetColumns.length === 1 && (targetColumns[0]?.pk || targetColumns[0]?.isUnique)) ||
    hasUniqueIndexFor(targetTable, targetIds) ||
    (() => {
      const pkCols = (targetTable.data.columns as Column[]).filter((c) => c.pk).map((c) => c.id);
      return pkCols.length === targetIds.size && pkCols.every((id) => targetIds.has(id));
    })();

  if (isSourceUnique && isTargetUnique) return DbRelationship.ONE_TO_ONE;
  if (isTargetUnique) return DbRelationship.MANY_TO_ONE;
  return DbRelationship.MANY_TO_ONE;
}

function parsePostgreSqlType(
  typeString: string
): [string, number | undefined, number | undefined, number | undefined] {
  const cleanType = typeString.trim().toUpperCase();
  
  // Handle SERIAL types
  if (cleanType === "SERIAL") {
    return ["INTEGER", undefined, undefined, undefined];
  }
  if (cleanType === "BIGSERIAL") {
    return ["BIGINT", undefined, undefined, undefined];
  }
  if (cleanType === "SMALLSERIAL") {
    return ["SMALLINT", undefined, undefined, undefined];
  }

  const typeMatch = cleanType.match(/^(\w+)(?:\(([^)]+)\))?/i);
  if (!typeMatch) {
    return [typeString.toUpperCase(), undefined, undefined, undefined];
  }

  const type = (typeMatch[1] || "").toUpperCase();
  const paramsStr = typeMatch[2];

  if (!paramsStr) {
    return [type, undefined, undefined, undefined];
  }

  // For time types with precision: TIMESTAMP(p), TIME(p)
  if (["TIMESTAMP", "TIME", "TIMESTAMPTZ", "TIMESTAMPTZ"].includes(type)) {
    const p = parseInt(paramsStr.trim(), 10);
    return [type, isNaN(p) ? undefined : p, undefined, undefined];
  }

  // For numeric types with precision and scale
  if (["NUMERIC", "DECIMAL"].includes(type)) {
    const params = paramsStr
      .split(",")
      .map((p) => {
        const num = parseInt(p.trim(), 10);
        return isNaN(num) ? undefined : num;
      })
      .filter((p): p is number => p !== undefined);

    if (params.length === 2) {
      return [type, undefined, params[0], params[1]];
    }
    if (params.length === 1) {
      return [type, params[0], undefined, undefined];
    }
  }

  // For character types with length
  if (["VARCHAR", "CHAR", "CHARACTER", "CHARACTER VARYING"].includes(type)) {
    const length = parseInt(paramsStr.trim(), 10);
    return [type, isNaN(length) ? undefined : length, undefined, undefined];
  }

  return [type, undefined, undefined, undefined];
}