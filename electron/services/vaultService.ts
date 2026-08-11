import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { VaultData } from '../../src/types';

const VAULT_FILE_NAME = 'omni_vault.enc';
const ITERATIONS = 100000;
const KEY_LEN = 32; // 256 bits
const ALGORITHM = 'aes-256-gcm';

export class VaultService {
  private vaultPath: string;
  private currentMasterKey: Buffer | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.vaultPath = path.join(userDataPath, VAULT_FILE_NAME);
  }

  public hasVault(): boolean {
    return fs.existsSync(this.vaultPath);
  }

  public isUnlocked(): boolean {
    return this.currentMasterKey !== null;
  }

  public lock(): void {
    this.currentMasterKey = null;
  }

  public initVault(passphrase: string): { success: boolean; error?: string } {
    try {
      const salt = crypto.randomBytes(16);
      const masterKey = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, 'sha256');
      
      const emptyData: VaultData = { servers: [], keys: [] };
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

      const jsonStr = JSON.stringify(emptyData);
      let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const payload = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted
      };

      fs.writeFileSync(this.vaultPath, JSON.stringify(payload, null, 2), 'utf8');
      this.currentMasterKey = masterKey;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public unlockVault(passphrase: string): { success: boolean; data?: VaultData; error?: string } {
    if (!this.hasVault()) {
      return { success: false, error: 'Kho dữ liệu chưa được khởi tạo.' };
    }

    try {
      const fileContent = fs.readFileSync(this.vaultPath, 'utf8');
      const payload = JSON.parse(fileContent);

      const salt = Buffer.from(payload.salt, 'hex');
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      const encryptedData = payload.data;

      const derivedKey = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, 'sha256');
      const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const data: VaultData = JSON.parse(decrypted);
      this.currentMasterKey = derivedKey;
      return { success: true, data: this.migrateKeysToOpenSSH(data) };
    } catch (err) {
      return { success: false, error: 'Master Password/Passphrase không chính xác.' };
    }
  }

  public getVaultData(): VaultData {
    if (!this.currentMasterKey || !this.hasVault()) {
      throw new Error('Kho dữ liệu đang bị khóa hoặc chưa khởi tạo.');
    }

    const fileContent = fs.readFileSync(this.vaultPath, 'utf8');
    const payload = JSON.parse(fileContent);

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const encryptedData = payload.data;

    const decipher = crypto.createDecipheriv(ALGORITHM, this.currentMasterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data: VaultData = JSON.parse(decrypted);
    return this.migrateKeysToOpenSSH(data);
  }

  public saveVaultData(data: VaultData): { success: boolean; error?: string } {
    if (!this.currentMasterKey) {
      return { success: false, error: 'Kho dữ liệu đang bị khóa.' };
    }

    try {
      const fileContent = fs.readFileSync(this.vaultPath, 'utf8');
      const payload = JSON.parse(fileContent);
      const salt = Buffer.from(payload.salt, 'hex');

      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, this.currentMasterKey, iv);

      const jsonStr = JSON.stringify(data);
      let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const newPayload = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        data: encrypted
      };

      fs.writeFileSync(this.vaultPath, JSON.stringify(newPayload, null, 2), 'utf8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public generateKeyPair(type: 'RSA-4096' | 'Ed25519'): { publicKey: string; privateKey: string } {
    if (type === 'Ed25519') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      
      const pubBytes = publicKey.export({ type: 'spki', format: 'der' }).slice(-32);
      const privBytes = privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32);
      
      const writeString = (str: string | Buffer): Buffer => {
        const buf = typeof str === 'string' ? Buffer.from(str) : str;
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(buf.length, 0);
        return Buffer.concat([lenBuf, buf]);
      };

      const magic = Buffer.from('openssh-key-v1\0');
      const cipherName = writeString('none');
      const kdfName = writeString('none');
      const kdfOpts = writeString('');
      const numKeys = Buffer.alloc(4);
      numKeys.writeUInt32BE(1, 0);

      const pubAlgo = writeString('ssh-ed25519');
      const pubKeyBytesStr = writeString(pubBytes);
      const pubKeyBlock = Buffer.concat([pubAlgo, pubKeyBytesStr]);
      const pubKeyBlockStr = writeString(pubKeyBlock);

      const checkInt = crypto.randomBytes(4);
      const privAlgo = writeString('ssh-ed25519');
      const privPubKeyBytesStr = writeString(pubBytes);
      const privKeyConcat = Buffer.concat([privBytes, pubBytes]);
      const privKeyStr = writeString(privKeyConcat);
      const commentStr = writeString('omni-key');

      let privBlock = Buffer.concat([
        checkInt,
        checkInt,
        privAlgo,
        privPubKeyBytesStr,
        privKeyStr,
        commentStr
      ]);

      const padLen = 8 - (privBlock.length % 8);
      if (padLen > 0 && padLen < 8) {
        const padding = Buffer.alloc(padLen);
        for (let i = 0; i < padLen; i++) {
          padding[i] = i + 1;
        }
        privBlock = Buffer.concat([privBlock, padding]);
      }
      const privBlockStr = writeString(privBlock);

      const finalBuf = Buffer.concat([
        magic,
        cipherName,
        kdfName,
        kdfOpts,
        numKeys,
        pubKeyBlockStr,
        privBlockStr
      ]);

      const base64 = finalBuf.toString('base64');
      const lines = base64.match(/.{1,70}/g) || [];
      const privateKeyOpenSSH = [
        '-----BEGIN OPENSSH PRIVATE KEY-----',
        ...lines,
        '-----END OPENSSH PRIVATE KEY-----'
      ].join('\n');

      const pubKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      return { publicKey: this.convertToOpenSSH(pubKeyPem), privateKey: privateKeyOpenSSH };
    } else {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
      });
      return { publicKey: this.convertToOpenSSH(publicKey), privateKey };
    }
  }

  public derivePublicKey(privateKey: string, passphrase?: string): { publicKey: string; privateKey: string; type: 'RSA-4096' | 'Ed25519' } {
    let cleanKey = privateKey.trim();
    
    // Strip BOM
    if (cleanKey.charCodeAt(0) === 0xFEFF) {
      cleanKey = cleanKey.substring(1);
    }
    // Strip UTF-16 BOM if it got read as UTF-8 string with BOM characters
    if (cleanKey.startsWith('\uFEFF') || cleanKey.startsWith('\uFFFE')) {
      cleanKey = cleanKey.substring(1);
    }
    // Remove null bytes
    cleanKey = cleanKey.replace(/\0/g, '');
    
    // Normalize newlines and trim each line
    cleanKey = cleanKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanKey.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    cleanKey = lines.join('\n');

    // Debug logging for developers to diagnose encoding
    const codes = [];
    for (let i = 0; i < Math.min(40, cleanKey.length); i++) {
      codes.push(cleanKey.charCodeAt(i));
    }
    console.log('[DEBUG] Key length:', cleanKey.length);
    console.log('[DEBUG] First 40 char codes:', codes);
    console.log('[DEBUG] Preview:', JSON.stringify(cleanKey.substring(0, 40)));

    if (cleanKey.includes('PuTTY-User-Key-File')) {
      throw new Error('Tệp khóa PuTTY (.ppk) không được hỗ trợ trực tiếp. Vui lòng chuyển đổi sang định dạng OpenSSH (PEM) bằng công cụ PuTTYgen (Conversions -> Export OpenSSH key).');
    }

    if (!cleanKey.startsWith('-----BEGIN')) {
      throw new Error('Định dạng khóa không hợp lệ. Khóa riêng tư (Private Key) hợp lệ phải bắt đầu bằng "-----BEGIN ... PRIVATE KEY-----". Hãy chắc chắn rằng bạn không chọn nhầm file Public Key (.pub).');
    }

    try {
      const { utils } = require('ssh2');
      const parsed = utils.parseKey(cleanKey, passphrase);
      
      const keyObj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!keyObj) {
        throw new Error('Không thể phân tích khóa.');
      }
      if (keyObj instanceof Error) {
        if (keyObj.message.includes('Unsupported key format') && cleanKey.includes('BEGIN OPENSSH PRIVATE KEY')) {
          throw new Error('Khóa Ed25519 có mật khẩu (passphrase) không được hỗ trợ giải mã trên hệ điều hành này. Vui lòng mở Terminal và chạy lệnh: ssh-keygen -p -f <file_key> (để trống mật khẩu mới) để gỡ mật khẩu khóa, sau đó import lại.');
        }
        throw keyObj;
      }
      
      const type = keyObj.type === 'ssh-ed25519' ? 'Ed25519' : 'RSA-4096';
      const publicKey = `${keyObj.type} ${keyObj.getPublicSSH().toString('base64')}`;
      
      let decryptedPrivateKey = cleanKey;
      try {
        decryptedPrivateKey = keyObj.getPrivatePEM();
      } catch {
        // Fallback to original cleanKey if PEM export fails
      }
      
      return { publicKey, privateKey: decryptedPrivateKey, type };
    } catch (err: any) {
      console.error('[DEBUG] derivePublicKey parsing caught error:', err.message, err.stack);
      if (err.message.includes('bad decrypt') || err.message.includes('passphrase') || err.message.includes('decryption') || err.message.includes('Encrypted')) {
        throw new Error('Mật khẩu giải mã khóa (Passphrase) không chính xác hoặc định dạng khóa bị lỗi.');
      }
      throw new Error(`Lỗi phân tích khóa: ${err.message}`);
    }
  }

  public convertToOpenSSH(publicKeyPem: string): string {
    try {
      const pubKey = crypto.createPublicKey(publicKeyPem);
      const jwk = pubKey.export({ format: 'jwk' });
      
      const base64urlToBuf = (b64url: string): Buffer => {
        let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) {
          b64 += '=';
        }
        return Buffer.from(b64, 'base64');
      };

      if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519' && jwk.x) {
        const xBuf = base64urlToBuf(jwk.x);
        const parts = [Buffer.from('ssh-ed25519'), xBuf];
        const buffers: Buffer[] = [];
        for (const p of parts) {
          const lenBuf = Buffer.alloc(4);
          lenBuf.writeUInt32BE(p.length, 0);
          buffers.push(lenBuf, p);
        }
        return `ssh-ed25519 ${Buffer.concat(buffers).toString('base64')}`;
      } else if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
        const eBuf = base64urlToBuf(jwk.e);
        const nBuf = base64urlToBuf(jwk.n);
        
        let nVal = nBuf;
        if (nVal[0] & 0x80) {
          nVal = Buffer.concat([Buffer.from([0x00]), nVal]);
        }
        let eVal = eBuf;
        if (eVal[0] & 0x80) {
          eVal = Buffer.concat([Buffer.from([0x00]), eVal]);
        }
        
        const parts = [Buffer.from('ssh-rsa'), eVal, nVal];
        const buffers: Buffer[] = [];
        for (const p of parts) {
          const lenBuf = Buffer.alloc(4);
          lenBuf.writeUInt32BE(p.length, 0);
          buffers.push(lenBuf, p);
        }
        return `ssh-rsa ${Buffer.concat(buffers).toString('base64')}`;
      }
      
      return publicKeyPem;
    } catch {
      return publicKeyPem;
    }
  }

  private migrateKeysToOpenSSH(data: VaultData): VaultData {
    if (data && Array.isArray(data.keys)) {
      data.keys = data.keys.map(k => {
        if (k.publicKey && k.publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
          k.publicKey = this.convertToOpenSSH(k.publicKey);
        }
        return k;
      });
    }
    return data;
  }

  public exportEncryptedVault(vaultData: VaultData, exportPassphrase: string): string {
    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(exportPassphrase, salt, ITERATIONS, KEY_LEN, 'sha256');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    const jsonStr = JSON.stringify(vaultData);
    let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const payload = {
      version: '1.1.0',
      encrypted: true,
      algorithm: ALGORITHM,
      kdf: 'PBKDF2-SHA256',
      iterations: ITERATIONS,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };

    return JSON.stringify(payload, null, 2);
  }

  public importEncryptedVault(fileContent: string, importPassphrase?: string): { success: boolean; data?: VaultData; error?: string } {
    try {
      const parsed = JSON.parse(fileContent);
      if (!parsed.encrypted) {
        // Plain text vault json (legacy format fallback)
        return { success: true, data: this.migrateKeysToOpenSSH(parsed) };
      }

      if (!importPassphrase) {
        return { success: false, error: 'FILE_ENCRYPTED' };
      }

      const salt = Buffer.from(parsed.salt, 'hex');
      const iv = Buffer.from(parsed.iv, 'hex');
      const authTag = Buffer.from(parsed.authTag, 'hex');
      const encryptedData = parsed.data;

      const derivedKey = crypto.pbkdf2Sync(importPassphrase, salt, parsed.iterations || ITERATIONS, KEY_LEN, 'sha256');
      const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const data: VaultData = JSON.parse(decrypted);
      return { success: true, data: this.migrateKeysToOpenSSH(data) };
    } catch (e: any) {
      return { success: false, error: 'Passphrase giải mã không chính xác hoặc tệp bị hỏng.' };
    }
  }
}

