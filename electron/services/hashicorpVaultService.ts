import { HashiCorpVaultConfig } from '../../src/types';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export class HashiCorpVaultService {
  private async makeRequest(
    urlStr: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(urlStr);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const requestBody = options.body ? JSON.stringify(options.body) : undefined;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        };

        if (requestBody) {
          headers['Content-Length'] = String(Buffer.byteLength(requestBody));
        }

        const req = client.request(
          parsedUrl,
          {
            method: options.method || 'GET',
            headers,
            rejectUnauthorized: false // Allow self-signed certificates in dev/local environments
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });

            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const json = JSON.parse(data);
                  resolve(json);
                } catch (e) {
                  resolve(data);
                }
              } else {
                reject(new Error(`HashiCorp Vault API Error (${res.statusCode}): ${data}`));
              }
            });
          }
        );

        req.on('error', (err) => {
          reject(new Error(`Không thể kết nối đến máy chủ HashiCorp Vault: ${err.message}`));
        });

        if (requestBody) {
          req.write(requestBody);
        }

        req.end();
      } catch (err: any) {
        reject(new Error(`Lỗi địa chỉ URL HashiCorp Vault: ${err.message}`));
      }
    });
  }

  public async testConnection(
    config: HashiCorpVaultConfig
  ): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const baseUrl = config.url.replace(/\/+$/, '');
      const healthUrl = `${baseUrl}/v1/sys/health`;
      let res: any;
      try {
        res = await this.makeRequest(healthUrl, { method: 'GET' });
      } catch (err: any) {
        // Vault returns HTTP 429 / 472 / 473 for Standby/PerfStandby nodes which is normal and valid for cluster nodes
        if (err.message.includes('API Error (429)') || err.message.includes('API Error (472)') || err.message.includes('API Error (473)')) {
          const jsonMatch = err.message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              res = JSON.parse(jsonMatch[0]);
            } catch (e) {
              res = { version: 'Cluster Node' };
            }
          } else {
            res = { version: 'Cluster Node' };
          }
        } else {
          throw err;
        }
      }

      return {
        success: true,
        version: res.version || 'v1.x (Standby Node)'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Không thể kết nối đến máy chủ HashiCorp Vault.'
      };
    }
  }

  public async fetchSecret(
    config: HashiCorpVaultConfig,
    secretPath: string,
    keyName: string = 'password'
  ): Promise<{ success: boolean; secret?: string; error?: string }> {
    try {
      if (!config || !config.url) {
        return { success: false, error: 'Chưa cấu hình thông tin máy chủ HashiCorp Vault.' };
      }

      const baseUrl = config.url.replace(/\/+$/, '');
      let token = config.token;

      // AppRole Auth Token Retrieval
      if (config.authMethod === 'approle' && config.roleId && config.secretId) {
        const loginUrl = `${baseUrl}/v1/auth/approle/login`;
        const loginRes = await this.makeRequest(loginUrl, {
          method: 'POST',
          body: {
            role_id: config.roleId,
            secret_id: config.secretId
          }
        });

        token = loginRes?.auth?.client_token;
      }

      if (!token) {
        return { success: false, error: 'Thiếu Vault Token hoặc AppRole Credential.' };
      }

      // Format KV Secret Path (Supports KV v1 & KV v2)
      let cleanPath = secretPath.replace(/^\/+/, '');
      let requestUrl = `${baseUrl}/v1/${cleanPath}`;

      // KV v2 path adjustment: if path is "secret/foo", convert to "secret/data/foo" if not already containing /data/
      if (cleanPath.startsWith('secret/') && !cleanPath.startsWith('secret/data/')) {
        cleanPath = cleanPath.replace('secret/', 'secret/data/');
        requestUrl = `${baseUrl}/v1/${cleanPath}`;
      }

      const headers: Record<string, string> = {
        'X-Vault-Token': token
      };

      if (config.namespace) {
        headers['X-Vault-Namespace'] = config.namespace;
      }

      const res = await this.makeRequest(requestUrl, {
        method: 'GET',
        headers
      });

      // Extract secret data (handles KV v1 & KV v2 response formats)
      const dataObj = res.data?.data || res.data || {};
      const targetValue = dataObj[keyName] || dataObj['password'] || dataObj['value'] || dataObj['secret'];

      if (!targetValue) {
        return {
          success: false,
          error: `Không tìm thấy khóa "${keyName}" trong secret path "${secretPath}". Danh sách khóa khả dụng: [${Object.keys(dataObj).join(', ')}]`
        };
      }

      return {
        success: true,
        secret: String(targetValue)
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || `Lỗi lấy secret từ HashiCorp Vault (${secretPath}).`
      };
    }
  }
}
