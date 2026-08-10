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
      return { success: true, data };
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

    return JSON.parse(decrypted);
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
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      return { publicKey, privateKey };
    } else {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      return { publicKey, privateKey };
    }
  }
}
