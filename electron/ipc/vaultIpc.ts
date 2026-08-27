import { ipcMain } from 'electron';
import { VaultService } from '../services/vaultService';

export const registerVaultIpc = (vaultService: VaultService) => {
  /* ================= Local Vault Encrypted Storage ================= */
  ipcMain.handle('vault:check-status', async (_, dbPath: string | null) => {
    return {
      hasVault: vaultService.hasVault(dbPath),
      isUnlocked: vaultService.isUnlocked()
    };
  });

  ipcMain.handle('vault:init', async (_, { dbPath, passphrase, keyFileContent }) => {
    return vaultService.initVault(dbPath, passphrase, keyFileContent);
  });

  ipcMain.handle('vault:unlock', async (_, { dbPath, passphrase, keyFileContent }) => {
    return vaultService.unlockVault(dbPath, passphrase, keyFileContent);
  });

  ipcMain.handle('vault:get-data', async () => {
    return vaultService.getVaultData();
  });

  ipcMain.handle('vault:save-data', async (_, data) => {
    return vaultService.saveVaultData(data);
  });

  ipcMain.handle('vault:lock', () => {
    vaultService.lock();
    return { success: true };
  });

  ipcMain.handle('vault:export-encrypted', async (_, { vaultData, passphrase }) => {
    try {
      const encryptedJson = vaultService.exportEncryptedVault(vaultData, passphrase);
      return { success: true, jsonContent: encryptedJson };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('vault:import-encrypted', async (_, { fileContent, passphrase }) => {
    return vaultService.importEncryptedVault(fileContent, passphrase);
  });

  ipcMain.handle('vault:generate-key', (_, type: 'RSA-4096' | 'Ed25519') => {
    return vaultService.generateKeyPair(type);
  });

  ipcMain.handle('vault:derive-public-key', (_, { privateKey, passphrase }) => {
    return vaultService.derivePublicKey(privateKey, passphrase);
  });

  /* ================= OTP Handlers ================= */
  ipcMain.handle('otp:generate', (_, secretKey: string) => {
    try {
      const { authenticator } = require('otplib');
      return { success: true, code: authenticator.generate(secretKey) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('otp:time-remaining', () => {
    try {
      const { authenticator } = require('otplib');
      return authenticator.timeRemaining();
    } catch (e) {
      return 30;
    }
  });
};
