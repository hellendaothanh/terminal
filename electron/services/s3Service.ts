import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createWriteStream } from 'fs';
import { createReadStream, statSync } from 'fs';
import * as path from 'path';

export class S3Service {
  private sessions: Map<string, S3Client> = new Map();
  private simulatedSessions: Set<string> = new Set();
  private mockRoot = 'C:\\Devsecops\\terminal\\.s3_mock';

  public connect(sessionId: string, options: {
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    // If credentials are mock or empty, mark as simulated session
    if (!options.accessKeyId || options.accessKeyId === 'mock' || options.accessKeyId === 'simulated' || !options.secretAccessKey || options.secretAccessKey === 'mock' || options.secretAccessKey === 'simulated') {
      this.simulatedSessions.add(sessionId);
      const fs = require('fs');
      if (!fs.existsSync(this.mockRoot)) {
        fs.mkdirSync(this.mockRoot);
      }
      const demoBucket = path.join(this.mockRoot, 'demo-s3-bucket');
      if (!fs.existsSync(demoBucket)) {
        fs.mkdirSync(demoBucket);
        fs.writeFileSync(
          path.join(demoBucket, 'welcome_readme.txt'),
          'Welcome to OmniTerminal Offline Simulated S3 Storage!\nYou can upload and download files here, and they will persist on your local filesystem.'
        );
        const logsDir = path.join(demoBucket, 'server-logs');
        fs.mkdirSync(logsDir);
        fs.writeFileSync(path.join(logsDir, 'app_error.log'), '[ERROR] OutOfMemory Exception in mock cloud worker');
      }
      return true;
    }

    try {
      const config: any = {
        region: options.region || 'us-east-1',
        forcePathStyle: options.forcePathStyle || false,
      };

      if (options.endpoint) {
        config.endpoint = options.endpoint;
      }

      if (options.accessKeyId && options.secretAccessKey) {
        config.credentials = {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        };
      }

      this.sessions.set(sessionId, new S3Client(config));
      return true;
    } catch {
      // Fallback to simulated if S3Client fails initialization
      this.simulatedSessions.add(sessionId);
      return true;
    }
  }

  public disconnect(sessionId: string) {
    if (this.simulatedSessions.has(sessionId)) {
      this.simulatedSessions.delete(sessionId);
      return true;
    }

    const client = this.sessions.get(sessionId);
    if (client) {
      client.destroy();
      this.sessions.delete(sessionId);
    }
    return true;
  }

  private getClient(sessionId: string): S3Client {
    const client = this.sessions.get(sessionId);
    if (!client) throw new Error('S3 Client is not connected for this session');
    return client;
  }

  private parseS3Path(remotePath: string) {
    const cleaned = remotePath.replace(/\\/g, '/');
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length === 0) {
      return { bucket: null, prefix: '' };
    }
    const bucket = parts[0];
    const prefix = parts.slice(1).join('/');
    return { bucket, prefix: prefix ? prefix + '/' : '' };
  }

  public async list(sessionId: string, remotePath: string) {
    if (this.simulatedSessions.has(sessionId)) {
      const fs = require('fs');
      if (remotePath === '' || remotePath === '/') {
        const dirs = fs.readdirSync(this.mockRoot, { withFileTypes: true });
        return dirs.filter((d: any) => d.isDirectory()).map((d: any) => {
          const stats = fs.statSync(path.join(this.mockRoot, d.name));
          return {
            name: d.name,
            size: 0,
            type: 'd',
            modifyTime: Math.floor(stats.birthtimeMs / 1000),
            rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
            owner: 0,
            group: 0
          };
        });
      }

      const cleanP = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      const fullPath = path.join(this.mockRoot, cleanP);
      if (!fs.existsSync(fullPath)) return [];
      const items = fs.readdirSync(fullPath, { withFileTypes: true });
      return items.map((it: any) => {
        const itemPath = path.join(fullPath, it.name);
        const stats = fs.statSync(itemPath);
        return {
          name: it.name,
          size: it.isDirectory() ? 0 : stats.size,
          type: it.isDirectory() ? 'd' : '-',
          modifyTime: Math.floor(stats.mtimeMs / 1000),
          rights: { user: 'rw-', group: 'r--', other: 'r--' },
          owner: 0,
          group: 0
        };
      });
    }

    const client = this.getClient(sessionId);

    if (remotePath === '' || remotePath === '/') {
      const command = new ListBucketsCommand({});
      const response = await client.send(command);
      
      return (response.Buckets || []).map(b => ({
        name: b.Name || '',
        size: 0,
        type: 'd',
        modifyTime: b.CreationDate ? Math.floor(b.CreationDate.getTime() / 1000) : 0,
        rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
        owner: 0,
        group: 0
      }));
    }

    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket) throw new Error('Invalid S3 path');

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/'
    });

    const response = await client.send(command);
    const result: any[] = [];

    if (response.CommonPrefixes) {
      for (const cp of response.CommonPrefixes) {
        if (!cp.Prefix) continue;
        const dirName = cp.Prefix.substring(prefix.length).replace(/\/$/, '');
        result.push({
          name: dirName,
          size: 0,
          type: 'd',
          modifyTime: 0,
          rights: { user: 'rwx', group: 'r-x', other: 'r-x' },
          owner: 0,
          group: 0
        });
      }
    }

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (!obj.Key || obj.Key === prefix) continue;
        const fileName = obj.Key.substring(prefix.length);
        if (fileName.includes('/')) continue;
        
        result.push({
          name: fileName,
          size: obj.Size || 0,
          type: '-',
          modifyTime: obj.LastModified ? Math.floor(obj.LastModified.getTime() / 1000) : 0,
          rights: { user: 'rw-', group: 'r--', other: 'r--' },
          owner: 0,
          group: 0
        });
      }
    }

    return result;
  }

  public async upload(sessionId: string, localPath: string, remotePath: string, onProgress: (transferred: number, total: number) => void) {
    if (this.simulatedSessions.has(sessionId)) {
      const fs = require('fs');
      const cleanP = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      const fullDest = path.join(this.mockRoot, cleanP);
      const destDir = path.dirname(fullDest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(localPath, fullDest);
      onProgress(100, 100);
      return true;
    }

    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket) throw new Error('Cannot upload to root. Specify a bucket.');

    const fileName = path.basename(localPath);
    const key = prefix + fileName;
    
    const stats = statSync(localPath);
    const totalSize = stats.size;
    const fileStream = createReadStream(localPath);

    const upload = new Upload({
      client: client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream
      }
    });

    upload.on('httpUploadProgress', (progress) => {
      onProgress(progress.loaded || 0, progress.total || totalSize);
    });

    await upload.done();
    return true;
  }

  public async download(sessionId: string, remotePath: string, localPath: string, onProgress: (transferred: number, total: number) => void) {
    if (this.simulatedSessions.has(sessionId)) {
      const fs = require('fs');
      const cleanP = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      const fullSrc = path.join(this.mockRoot, cleanP);
      fs.copyFileSync(fullSrc, localPath);
      onProgress(100, 100);
      return true;
    }

    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket || !prefix) throw new Error('Invalid download path');

    const key = prefix.replace(/\/$/, '');

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await client.send(command);
    const totalSize = response.ContentLength || 0;
    
    return new Promise((resolve, reject) => {
      if (!response.Body) return reject(new Error('Empty response body'));
      
      const readStream = response.Body as any;
      const writeStream = createWriteStream(localPath);
      let downloaded = 0;

      readStream.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        onProgress(downloaded, totalSize);
      });

      readStream.pipe(writeStream);

      writeStream.on('finish', () => resolve(true));
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });
  }

  public async mkdir(sessionId: string, remotePath: string) {
    if (this.simulatedSessions.has(sessionId)) {
      const fs = require('fs');
      const cleanP = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      const fullPath = path.join(this.mockRoot, cleanP);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return true;
    }

    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket) throw new Error('Cannot create directory at root level');
    
    let key = prefix;
    if (!key.endsWith('/')) {
      key += '/';
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: ''
    });

    await client.send(command);
    return true;
  }

  public async delete(sessionId: string, remotePath: string, isDir: boolean) {
    if (this.simulatedSessions.has(sessionId)) {
      const fs = require('fs');
      const cleanP = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      const fullPath = path.join(this.mockRoot, cleanP);
      if (fs.existsSync(fullPath)) {
        if (isDir) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
      return true;
    }

    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket) throw new Error('Cannot delete root level items through this interface');
    
    let key = prefix.replace(/\/$/, '');
    if (isDir) {
      key += '/';
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await client.send(command);
    return true;
  }
}
