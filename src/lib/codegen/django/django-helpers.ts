export function toDjangoTableName(tableName: string): string {
  return tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export function toDjangoModelName(tableName: string): string {
  return tableName
    .split(/[^a-zA-Z0-9]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function toDjangoAppName(tableName: string): string {
  // Convert table name to app name (singular, lowercase)
  const name = tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  // Remove common plural suffixes
  return name.replace(/s$/, '').replace(/_table$/, '');
}

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// MySQL to Django field type mapping
const MYSQL_TO_DJANGO: Record<string, string> = {
  'int': 'models.IntegerField',
  'integer': 'models.IntegerField',
  'bigint': 'models.BigIntegerField',
  'smallint': 'models.SmallIntegerField',
  'tinyint': 'models.SmallIntegerField',
  'mediumint': 'models.IntegerField',
  'varchar': 'models.CharField',
  'char': 'models.CharField',
  'text': 'models.TextField',
  'longtext': 'models.TextField',
  'mediumtext': 'models.TextField',
  'tinytext': 'models.CharField',
  'decimal': 'models.DecimalField',
  'numeric': 'models.DecimalField',
  'float': 'models.FloatField',
  'double': 'models.FloatField',
  'real': 'models.FloatField',
  'boolean': 'models.BooleanField',
  'bool': 'models.BooleanField',
  'date': 'models.DateField',
  'time': 'models.TimeField',
  'datetime': 'models.DateTimeField',
  'timestamp': 'models.DateTimeField',
  'json': 'models.JSONField',
  'enum': 'models.CharField',
  'set': 'models.CharField',
  'uuid': 'models.UUIDField',
  'binary': 'models.BinaryField',
  'varbinary': 'models.BinaryField',
  'blob': 'models.BinaryField',
  'longblob': 'models.BinaryField',
  'mediumblob': 'models.BinaryField',
  'tinyblob': 'models.BinaryField'
};

// PostgreSQL to Django field type mapping
const POSTGRES_TO_DJANGO: Record<string, string> = {
  'integer': 'models.IntegerField',
  'int': 'models.IntegerField',
  'int4': 'models.IntegerField',
  'bigint': 'models.BigIntegerField',
  'int8': 'models.BigIntegerField',
  'smallint': 'models.SmallIntegerField',
  'int2': 'models.SmallIntegerField',
  'varchar': 'models.CharField',
  'character varying': 'models.CharField',
  'char': 'models.CharField',
  'character': 'models.CharField',
  'text': 'models.TextField',
  'decimal': 'models.DecimalField',
  'numeric': 'models.DecimalField',
  'real': 'models.FloatField',
  'float4': 'models.FloatField',
  'double precision': 'models.FloatField',
  'float8': 'models.FloatField',
  'boolean': 'models.BooleanField',
  'bool': 'models.BooleanField',
  'date': 'models.DateField',
  'time': 'models.TimeField',
  'timestamp': 'models.DateTimeField',
  'timestamptz': 'models.DateTimeField',
  'json': 'models.JSONField',
  'jsonb': 'models.JSONField',
  'uuid': 'models.UUIDField',
  'bytea': 'models.BinaryField',
  'serial': 'models.AutoField',
  'bigserial': 'models.BigAutoField',
  'smallserial': 'models.SmallAutoField'
};

export function getDjangoFieldType(columnType: string, databaseType: 'mysql' | 'postgresql' = 'mysql'): string {
  const type = columnType.toLowerCase().trim();
  
  // Handle auto increment fields
  if (type.includes('auto_increment') || type.includes('serial')) {
    if (type.includes('bigint') || type.includes('bigserial')) {
      return 'models.BigAutoField';
    }
    if (type.includes('smallint') || type.includes('smallserial')) {
      return 'models.SmallAutoField';
    }
    return 'models.AutoField';
  }
  
  // Extract base type (remove size specifications)
  const baseType = type.replace(/\([^)]*\)/g, '').trim();
  
  const mapping = databaseType === 'postgresql' ? POSTGRES_TO_DJANGO : MYSQL_TO_DJANGO;
  
  return mapping[baseType] || 'models.CharField';
}

export function extractFieldOptions(columnType: string, columnInfo: any): string[] {
  const options: string[] = [];
  const type = columnType.toLowerCase();
  
  // Extract max_length for CharField
  if (type.includes('varchar') || type.includes('char')) {
    const lengthMatch = type.match(/\((\d+)\)/);
    if (lengthMatch) {
      options.push(`max_length=${lengthMatch[1]}`);
    } else if (type.includes('varchar')) {
      options.push('max_length=255'); // Default for varchar without length
    }
  }
  
  // Extract max_digits and decimal_places for DecimalField
  if (type.includes('decimal') || type.includes('numeric')) {
    const decimalMatch = type.match(/\((\d+),\s*(\d+)\)/);
    if (decimalMatch) {
      options.push(`max_digits=${decimalMatch[1]}`);
      options.push(`decimal_places=${decimalMatch[2]}`);
    }
  }
  
  // Handle nullable fields
  if (columnInfo?.nullable === false) {
    options.push('null=False');
  } else if (columnInfo?.nullable === true) {
    options.push('null=True');
  }
  
  // Handle unique constraints
  if (columnInfo?.isUnique) {
    options.push('unique=True');
  }
  
  // Handle default values
  if (columnInfo?.defaultValue !== undefined && columnInfo?.defaultValue !== null) {
    const defaultVal = columnInfo.defaultValue;
    if (typeof defaultVal === 'string') {
      options.push(`default='${escapeString(defaultVal)}'`);
    } else {
      options.push(`default=${defaultVal}`);
    }
  }
  
  // Handle choices for ENUM fields
  if (type.includes('enum')) {
    const enumMatch = type.match(/enum\s*\((.*)\)/i);
    if (enumMatch) {
      const values = enumMatch[1]
        .split(',')
        .map(v => v.trim().replace(/['"]/g, ''))
        .filter(v => v.length > 0);
      
      const choices = values.map(v => `('${v}', '${v}')`).join(', ');
      options.push(`choices=[${choices}]`);
      
      // Set max_length for enum fields
      const maxLength = Math.max(...values.map(v => v.length));
      options.push(`max_length=${maxLength}`);
    }
  }
  
  return options;
}

export function getDjangoOnDeleteAction(onDelete?: string): string {
  switch (onDelete?.toUpperCase()) {
    case 'CASCADE':
      return 'models.CASCADE';
    case 'SET NULL':
      return 'models.SET_NULL';
    case 'RESTRICT':
    case 'NO ACTION':
      return 'models.PROTECT';
    case 'SET DEFAULT':
      return 'models.SET_DEFAULT';
    default:
      return 'models.CASCADE'; // Default behavior
  }
}

export function formatPythonString(str: string): string {
  // Escape quotes and format for Python string literals
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}