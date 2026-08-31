import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../../eprocurement.db');
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let sqlInstance: any = null;
let rawDb: SqlJsDatabase | null = null;

function saveDb() {
  if (rawDb) {
    try {
      const data = rawDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('Error saving SQLite database:', e);
    }
  }
}

export async function getDbInstance(): Promise<SqlJsDatabase> {
  if (rawDb) return rawDb;

  if (!sqlInstance) {
    sqlInstance = await initSqlJs();
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new sqlInstance.Database(fileBuffer);
  } else {
    rawDb = new sqlInstance.Database();
  }

  rawDb!.run("PRAGMA foreign_keys = ON;");
  return rawDb!;
}

export class StatementWrapper {
  private sql: string;

  constructor(sql: string) {
    this.sql = sql;
  }

  all(...params: any[]): any[] {
    if (!rawDb) throw new Error('Database not initialized. Call initDatabase() first.');
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    
    // sql.js exec returns [{ columns: [...], values: [[...], [...]] }]
    const stmt = rawDb.prepare(this.sql);
    if (flatParams && flatParams.length > 0) {
      stmt.bind(flatParams);
    }

    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  get(...params: any[]): any | undefined {
    const rows = this.all(...params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  run(...params: any[]): { changes: number } {
    if (!rawDb) throw new Error('Database not initialized. Call initDatabase() first.');
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    
    rawDb.run(this.sql, flatParams);
    saveDb();
    return { changes: rawDb.getRowsModified() };
  }
}

export const db = {
  prepare(sql: string) {
    return new StatementWrapper(sql);
  },
  exec(sql: string) {
    if (!rawDb) throw new Error('Database not initialized. Call initDatabase() first.');
    rawDb.run(sql);
    saveDb();
  }
};

export async function initDatabase() {
  await getDbInstance();
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  console.log('Database initialized successfully with SQL.js.');
}
