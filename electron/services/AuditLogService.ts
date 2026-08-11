import fs from 'fs';
import path from 'path';
import { app, dialog } from 'electron';
import { AuditLogEntry } from '../../src/types';

export class AuditLogService {
  private logDir: string;
  private memoryLogs: AuditLogEntry[] = [];
  private activeCastFrames: Map<string, { startTime: number; frames: Array<[number, string, string]> }> = new Map();

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logDir = path.join(userDataPath, 'audit_logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.loadIndexLogs();
  }

  private loadIndexLogs() {
    const indexPath = path.join(this.logDir, 'audit_index.json');
    if (fs.existsSync(indexPath)) {
      try {
        const raw = fs.readFileSync(indexPath, 'utf-8');
        this.memoryLogs = JSON.parse(raw);
      } catch (e) {
        this.memoryLogs = [];
      }
    }
  }

  private saveIndexLogs() {
    const indexPath = path.join(this.logDir, 'audit_index.json');
    try {
      fs.writeFileSync(indexPath, JSON.stringify(this.memoryLogs, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving audit index:', e);
    }
  }

  public calculateRiskLevel(commandStr: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highRiskKeywords = ['rm -rf', 'drop database', 'drop table', 'truncate', 'chmod 777', 'mkfs', 'dd if=', 'shutdown', 'reboot', 'init 0'];
    const mediumRiskKeywords = ['sudo', 'su -', 'systemctl stop', 'service stop', 'delete from', 'update ', 'kill -9', 'pkill'];
    
    const lower = commandStr.toLowerCase();
    if (highRiskKeywords.some(kw => lower.includes(kw))) return 'HIGH';
    if (mediumRiskKeywords.some(kw => lower.includes(kw))) return 'MEDIUM';
    return 'LOW';
  }

  public logEntry(entry: Partial<AuditLogEntry>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: entry.id || 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      sessionId: entry.sessionId || 'session_' + Date.now(),
      targetId: entry.targetId,
      targetName: entry.targetName || 'Unknown Target',
      protocol: entry.protocol || 'SSH',
      user: entry.user || 'root',
      commandOrQuery: entry.commandOrQuery || '',
      status: entry.status || 'SUCCESS',
      executionTimeMs: entry.executionTimeMs || 0,
      timestamp: entry.timestamp || Date.now(),
      riskLevel: entry.riskLevel || this.calculateRiskLevel(entry.commandOrQuery || '')
    };

    this.memoryLogs.unshift(fullEntry);
    if (this.memoryLogs.length > 500) {
      this.memoryLogs = this.memoryLogs.slice(0, 500); // Keep last 500 logs
    }
    this.saveIndexLogs();
    return fullEntry;
  }

  public startCastRecording(sessionId: string) {
    this.activeCastFrames.set(sessionId, {
      startTime: Date.now(),
      frames: []
    });
  }

  public recordCastFrame(sessionId: string, type: 'i' | 'o', data: string) {
    const session = this.activeCastFrames.get(sessionId);
    if (session) {
      const offsetSeconds = (Date.now() - session.startTime) / 1000;
      session.frames.push([offsetSeconds, type, data]);
    }
  }

  public finishCastRecording(sessionId: string, logEntry: Partial<AuditLogEntry>) {
    const session = this.activeCastFrames.get(sessionId);
    const frames = session ? session.frames : [];
    this.activeCastFrames.delete(sessionId);

    const created = this.logEntry({
      ...logEntry,
      sessionId
    });

    // Write asciinema .cast file
    const castFilePath = path.join(this.logDir, `${created.id}.cast`);
    const header = {
      version: 2,
      width: 120,
      height: 30,
      timestamp: Math.floor(created.timestamp / 1000),
      title: `${created.protocol} Session - ${created.targetName}`
    };

    let fileContent = JSON.stringify(header) + '\n';
    frames.forEach(frame => {
      fileContent += JSON.stringify(frame) + '\n';
    });

    try {
      fs.writeFileSync(castFilePath, fileContent, 'utf-8');
    } catch (e) {
      console.error('Error writing .cast file:', e);
    }

    return created;
  }

  public getList(): AuditLogEntry[] {
    return this.memoryLogs;
  }

  public getCast(logId: string): { header: any; frames: Array<[number, string, string]> } | null {
    const castFilePath = path.join(this.logDir, `${logId}.cast`);
    if (!fs.existsSync(castFilePath)) return null;

    try {
      const content = fs.readFileSync(castFilePath, 'utf-8');
      const lines = content.trim().split('\n');
      if (lines.length === 0) return null;

      const header = JSON.parse(lines[0]);
      const frames: Array<[number, string, string]> = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          frames.push(JSON.parse(lines[i]));
        }
      }
      return { header, frames };
    } catch (e) {
      return null;
    }
  }

  public async exportLog(logId: string, format: 'cast' | 'txt'): Promise<{ success: boolean; path?: string; error?: string }> {
    const log = this.memoryLogs.find(l => l.id === logId);
    if (!log) return { success: false, error: 'Audit Log không tồn tại.' };

    const castData = this.getCast(logId);

    const defaultName = `audit_${log.targetName.replace(/[^a-zA-Z0-9]/g, '_')}_${log.id}.${format}`;
    const { filePath } = await dialog.showSaveDialog({
      title: 'Xuất Nhật Ký Kiểm Toán',
      defaultPath: defaultName,
      filters: format === 'cast' ? [{ name: 'Asciinema Cast File', extensions: ['cast'] }] : [{ name: 'Text File', extensions: ['txt', 'log'] }]
    });

    if (!filePath) return { success: false, error: 'Đã hủy thao tác lưu.' };

    try {
      if (format === 'cast') {
        const castFilePath = path.join(this.logDir, `${logId}.cast`);
        if (fs.existsSync(castFilePath)) {
          fs.copyFileSync(castFilePath, filePath);
        } else {
          return { success: false, error: 'Chưa có bản ghi .cast cho phiên này.' };
        }
      } else {
        let textContent = `==================================================\n`;
        textContent += `AUDIT LOG REPORT - OMNITERMINAL\n`;
        textContent += `==================================================\n`;
        textContent += `Log ID: ${log.id}\n`;
        textContent += `Target: ${log.targetName}\n`;
        textContent += `Protocol: ${log.protocol}\n`;
        textContent += `User: ${log.user}\n`;
        textContent += `Time: ${new Date(log.timestamp).toLocaleString()}\n`;
        textContent += `Risk Level: ${log.riskLevel}\n`;
        textContent += `Status: ${log.status}\n`;
        textContent += `Execution Time: ${log.executionTimeMs || 0} ms\n`;
        textContent += `--------------------------------------------------\n`;
        textContent += `COMMAND / QUERY:\n${log.commandOrQuery}\n`;
        textContent += `==================================================\n`;

        if (castData && castData.frames) {
          textContent += `\nSESSION TERMINAL OUTPUT:\n`;
          castData.frames.forEach(f => {
            if (f[1] === 'o') textContent += f[2];
          });
        }

        fs.writeFileSync(filePath, textContent, 'utf-8');
      }

      return { success: true, path: filePath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
