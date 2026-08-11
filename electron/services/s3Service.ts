import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createWriteStream } from 'fs';
import { createReadStream, statSync } from 'fs';
import * as path from 'path';

export class S3Service {
  private sessions: Map<string, S3Client> = new Map();

  public connect(sessionId: string, options: {
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
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
  }

  public disconnect(sessionId: string) {
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
    // remotePath format: /bucket-name/prefix/to/object
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
    const client = this.getClient(sessionId);

    if (remotePath === '' || remotePath === '/') {
      // List Buckets
      const command = new ListBucketsCommand({});
      const response = await client.send(command);
      
      return (response.Buckets || []).map(b => ({
        name: b.Name || '',
        size: 0,
        type: 'd', // directory conceptually
        modifyTime: b.CreationDate ? b.CreationDate.getTime() : 0,
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

    // Directories (CommonPrefixes)
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

    // Files (Contents)
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (!obj.Key || obj.Key === prefix) continue; // Skip the directory placeholder itself
        const fileName = obj.Key.substring(prefix.length);
        if (fileName.includes('/')) continue; // Should be handled by CommonPrefixes, but just in case
        
        result.push({
          name: fileName,
          size: obj.Size || 0,
          type: '-',
          modifyTime: obj.LastModified ? obj.LastModified.getTime() : 0,
          rights: { user: 'rw-', group: 'r--', other: 'r--' },
          owner: 0,
          group: 0
        });
      }
    }

    return result;
  }

  public async upload(sessionId: string, localPath: string, remotePath: string, onProgress: (transferred: number, total: number) => void) {
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
    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket || !prefix) throw new Error('Invalid download path');

    // Remove trailing slash for exact object key
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
    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket) throw new Error('Cannot create directory at root level');
    
    // To create a "directory" in S3, we upload an empty object with a trailing slash
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
    const client = this.getClient(sessionId);
    const { bucket, prefix } = this.parseS3Path(remotePath);
    if (!bucket) throw new Error('Cannot delete root level items through this interface');
    
    let key = prefix.replace(/\/$/, '');
    if (isDir) {
      // Deleting a directory requires deleting all objects with that prefix
      // For simplicity in this basic implementation, we just delete the prefix marker.
      // In a real S3 manager, you'd list all objects with prefix and delete them in bulk.
      // Let's at least delete the folder marker itself.
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
