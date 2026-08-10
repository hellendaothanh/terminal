import { HashiCorpVaultConfig } from '../../src/types';

export class HashiCorpVaultService {
  private async makeRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    }
  ): Promise<any> {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HashiCorp Vault API Error (${response.status}): ${errText}`);
    }

    return response.json();
  }

  public async testConnection(
    config: HashiCorpVaultConfig
  ): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const baseUrl = config.url.replace(/\/+$/, '');
      const healthUrl = `${baseUrl}/v1/sys/health`;
      const res = await this.makeRequest(healthUrl, { method: 'GET' });
      return {
        success: true,
        version: res.version || 'v1.x'
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
