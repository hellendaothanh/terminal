import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export class TeamSyncService {
  
  public async push(config: any, encryptedPayload: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (config.provider === 'GIST') {
        const gistId = config.gistId;
        const token = config.gistToken;
        if (!gistId || !token) throw new Error('Missing Gist ID or Token');

        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            files: {
              'omni_vault.enc.json': {
                content: encryptedPayload
              }
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Gist Push Failed: ${response.statusText}`);
        }

        return { success: true };
      } else if (config.provider === 'S3') {
        if (!config.s3Bucket || !config.s3AccessKey || !config.s3SecretKey) {
          throw new Error('Missing S3 Configuration');
        }

        const client = new S3Client({
          region: config.s3Region || 'us-east-1',
          endpoint: config.s3Endpoint || undefined,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.s3AccessKey,
            secretAccessKey: config.s3SecretKey
          }
        });

        const command = new PutObjectCommand({
          Bucket: config.s3Bucket,
          Key: config.s3Path || 'omni_vault.enc.json',
          Body: encryptedPayload,
          ContentType: 'application/json'
        });

        await client.send(command);
        return { success: true };
      }

      throw new Error('Unsupported provider');
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async pull(config: any): Promise<{ success: boolean; encryptedPayload?: string; error?: string }> {
    try {
      if (config.provider === 'GIST') {
        const gistId = config.gistId;
        const token = config.gistToken;
        if (!gistId || !token) throw new Error('Missing Gist ID or Token');

        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!response.ok) {
          throw new Error(`Gist Pull Failed: ${response.statusText}`);
        }

        const data: any = await response.json();
        const file = data.files['omni_vault.enc.json'];
        if (!file || !file.content) {
          throw new Error('File omni_vault.enc.json not found in Gist');
        }

        return { success: true, encryptedPayload: file.content };
      } else if (config.provider === 'S3') {
        if (!config.s3Bucket || !config.s3AccessKey || !config.s3SecretKey) {
          throw new Error('Missing S3 Configuration');
        }

        const client = new S3Client({
          region: config.s3Region || 'us-east-1',
          endpoint: config.s3Endpoint || undefined,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.s3AccessKey,
            secretAccessKey: config.s3SecretKey
          }
        });

        const command = new GetObjectCommand({
          Bucket: config.s3Bucket,
          Key: config.s3Path || 'omni_vault.enc.json'
        });

        const response = await client.send(command);
        const strContent = await response.Body?.transformToString();

        if (!strContent) {
          throw new Error('Empty body received from S3');
        }

        return { success: true, encryptedPayload: strContent };
      }

      throw new Error('Unsupported provider');
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
