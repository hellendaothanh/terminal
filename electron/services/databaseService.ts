import mysql from 'mysql2/promise';
import { Client as PGClient } from 'pg';
import Redis from 'ioredis';
import { ServerConfig, SSHKey, DBQueryResult } from '../../src/types';

export interface DBOptions {
  sessionId: string;
  server: ServerConfig;
  key?: SSHKey;
}

export class DatabaseService {
  private activeMySQL: Map<string, mysql.Connection> = new Map();
  private activePG: Map<string, PGClient> = new Map();
  private activeRedis: Map<string, Redis> = new Map();

  public async connect(options: DBOptions): Promise<{ success: boolean; error?: string }> {
    const { sessionId, server } = options;
    const dbType = server.dbType || 'MySQL';
    const host = server.host;
    const port = server.port || (dbType === 'MySQL' ? 3306 : dbType === 'PostgreSQL' ? 5432 : dbType === 'Redis' ? 6379 : 27017);
    const user = server.username;
    const password = server.password || '';
    const database = server.dbName || (dbType === 'PostgreSQL' ? 'postgres' : undefined);

    try {
      if (dbType === 'MySQL') {
        const conn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          database,
          connectTimeout: 10000
        });
        this.activeMySQL.set(sessionId, conn);
        return { success: true };
      } else if (dbType === 'PostgreSQL') {
        const client = new PGClient({
          host,
          port,
          user,
          password,
          database: database || 'postgres',
          connectionTimeoutMillis: 10000,
          ssl: {
            rejectUnauthorized: false
          }
        });
        await client.connect();
        this.activePG.set(sessionId, client);
        return { success: true };
      } else if (dbType === 'Redis') {
        const redis = new Redis({
          host,
          port,
          password: password || undefined,
          connectTimeout: 10000,
          maxRetriesPerRequest: 1
        });
        await redis.ping();
        this.activeRedis.set(sessionId, redis);
        return { success: true };
      } else {
        // Fallback / MongoDB TCP check
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message || `Kết nối ${dbType} thất bại.` };
    }
  }

  public async listDatabases(sessionId: string, dbType: string): Promise<{ success: boolean; databases?: string[]; error?: string }> {
    try {
      if (dbType === 'MySQL') {
        const conn = this.activeMySQL.get(sessionId);
        if (!conn) return { success: false, error: 'Chưa kết nối MySQL.' };
        const [rows]: any = await conn.query('SHOW DATABASES;');
        const databases = rows.map((r: any) => Object.values(r)[0] as string);
        return { success: true, databases };
      } else if (dbType === 'PostgreSQL') {
        const pg = this.activePG.get(sessionId);
        if (!pg) return { success: false, error: 'Chưa kết nối PostgreSQL.' };
        const res = await pg.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
        const databases = res.rows.map((r: any) => r.datname);
        return { success: true, databases };
      } else if (dbType === 'Redis') {
        const databases = Array.from({ length: 16 }, (_, i) => `db${i}`);
        return { success: true, databases };
      }
      return { success: true, databases: ['default'] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async listTables(sessionId: string, dbType: string, dbName?: string): Promise<{ success: boolean; tables?: string[]; error?: string }> {
    try {
      if (dbType === 'MySQL') {
        const conn = this.activeMySQL.get(sessionId);
        if (!conn) return { success: false, error: 'Chưa kết nối MySQL.' };
        if (dbName) await conn.query(`USE \`${dbName}\`;`);
        const [rows]: any = await conn.query('SHOW TABLES;');
        const tables = rows.map((r: any) => Object.values(r)[0] as string);
        return { success: true, tables };
      } else if (dbType === 'PostgreSQL') {
        const pg = this.activePG.get(sessionId);
        if (!pg) return { success: false, error: 'Chưa kết nối PostgreSQL.' };
        
        // If a specific target database is selected, re-connect to that database if needed
        if (dbName && pg.database !== dbName) {
          try {
            await pg.end();
          } catch (e) {}
          // Get connection options from existing client if possible, or construct
          const newPg = new PGClient({
            host: (pg as any).connectionParameters.host,
            port: (pg as any).connectionParameters.port,
            user: (pg as any).connectionParameters.user,
            password: (pg as any).connectionParameters.password,
            database: dbName,
            connectionTimeoutMillis: 10000,
            ssl: { rejectUnauthorized: false }
          });
          await newPg.connect();
          this.activePG.set(sessionId, newPg);
        }

        const activeClient = this.activePG.get(sessionId) || pg;
        const res = await activeClient.query(`
          SELECT table_schema || '.' || table_name AS full_table_name, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name;
        `);
        const tables = res.rows.map((r: any) => (r.full_table_name.startsWith('public.') ? r.table_name : r.full_table_name));
        return { success: true, tables };
      } else if (dbType === 'Redis') {
        const redis = this.activeRedis.get(sessionId);
        if (!redis) return { success: false, error: 'Chưa kết nối Redis.' };
        const keys = await redis.keys('*');
        return { success: true, tables: keys.slice(0, 100) };
      }
      return { success: true, tables: [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async executeQuery(sessionId: string, dbType: string, queryStr: string, dbName?: string): Promise<DBQueryResult> {
    const startTime = Date.now();
    try {
      if (dbType === 'MySQL') {
        const conn = this.activeMySQL.get(sessionId);
        if (!conn) return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0, error: 'Chưa kết nối MySQL.' };
        if (dbName) await conn.query(`USE \`${dbName}\`;`);
        const [rows, fields]: any = await conn.query(queryStr);
        const executionTimeMs = Date.now() - startTime;

        if (Array.isArray(rows)) {
          const columns = fields ? fields.map((f: any) => f.name) : (rows[0] ? Object.keys(rows[0]) : []);
          return { columns, rows, rowCount: rows.length, executionTimeMs };
        } else {
          return { columns: ['Affected Rows', 'Insert ID'], rows: [{ 'Affected Rows': rows.affectedRows, 'Insert ID': rows.insertId }], rowCount: 1, executionTimeMs };
        }
      } else if (dbType === 'PostgreSQL') {
        const pg = this.activePG.get(sessionId);
        if (!pg) return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0, error: 'Chưa kết nối PostgreSQL.' };
        const res = await pg.query(queryStr);
        const executionTimeMs = Date.now() - startTime;
        const columns = res.fields ? res.fields.map((f) => f.name) : (res.rows[0] ? Object.keys(res.rows[0]) : []);
        return { columns, rows: res.rows, rowCount: res.rowCount || res.rows.length, executionTimeMs };
      } else if (dbType === 'Redis') {
        const redis = this.activeRedis.get(sessionId);
        if (!redis) return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0, error: 'Chưa kết nối Redis.' };
        const parts = queryStr.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        const res = await (redis as any)[cmd](...args);
        const executionTimeMs = Date.now() - startTime;
        return {
          columns: ['Key / Result', 'Value'],
          rows: Array.isArray(res) ? res.map((v, i) => ({ Index: i, Value: String(v) })) : [{ Result: String(res) }],
          rowCount: Array.isArray(res) ? res.length : 1,
          executionTimeMs
        };
      }

      return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0, error: 'Database type không hỗ trợ.' };
    } catch (err: any) {
      return { columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - startTime, error: err.message };
    }
  }

  public async disconnect(sessionId: string): Promise<void> {
    if (this.activeMySQL.has(sessionId)) {
      try {
        await this.activeMySQL.get(sessionId)?.end();
      } catch (e) { }
      this.activeMySQL.delete(sessionId);
    }

    if (this.activePG.has(sessionId)) {
      try {
        await this.activePG.get(sessionId)?.end();
      } catch (e) { }
      this.activePG.delete(sessionId);
    }

    if (this.activeRedis.has(sessionId)) {
      try {
        await this.activeRedis.get(sessionId)?.quit();
      } catch (e) { }
      this.activeRedis.delete(sessionId);
    }
  }
}
