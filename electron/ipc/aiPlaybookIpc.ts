import { ipcMain } from 'electron';
import { AIService } from '../services/aiService';
import { SSHService } from '../services/sshService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';

export const registerAiPlaybookIpc = (
  aiService: AIService,
  sshService: SSHService,
  hashicorpVaultService: HashiCorpVaultService
) => {
  /* ================= AI Assistant & Playbook Handlers ================= */
  ipcMain.handle('ai:test-key', async (_, settings) => {
    return aiService.testApiKey(settings);
  });

  ipcMain.handle('ai:chat', async (_, { settings, userPrompt, history, contextSnippet }) => {
    return aiService.chatCompletion(settings, userPrompt, history, contextSnippet);
  });

  ipcMain.handle('ai:generate-playbook', async (_, { settings, userPrompt, contextSnippet, targetServerInfo }) => {
    return aiService.generatePlaybook(settings, userPrompt, contextSnippet, targetServerInfo);
  });

  ipcMain.handle('server:inspect-telemetry', async (_, { server, key, vaultConfig }) => {
    try {
      if (server.protocol !== 'SSH') {
        return {
          success: true,
          info: `Protocol: ${server.protocol}, Target: ${server.host}:${server.port}, Environment: ${server.environment}`
        };
      }

      if (server.authType === 'hashicorpVault' && server.vaultSecretPath && vaultConfig) {
        const vaultRes = await hashicorpVaultService.fetchSecret(vaultConfig, server.vaultSecretPath, server.vaultKeyName || 'password');
        if (vaultRes.success && vaultRes.secret) {
          server.password = vaultRes.secret;
        }
      }

      const inspectCmd = `
echo "=== SYSTEM INFO ==="
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "OS: $NAME $VERSION ($ID)"
elif [ -f /etc/redhat-release ]; then
  echo "OS: $(cat /etc/redhat-release)"
else
  echo "OS: $(uname -s -r -m)"
fi
echo "Kernel: $(uname -r) $(uname -m)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "=== CPU & LOAD ==="
echo "CPU Model: $(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d: -f2 | xargs || uname -p)"
echo "Cores: $(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)"
echo "Load Average: $(cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}' || uptime | awk -F'load average:' '{print $2}')"
echo "=== MEMORY & DISK ==="
free -h 2>/dev/null || free -m 2>/dev/null
df -h / /var /opt /home 2>/dev/null | awk 'NR==1 || $NF=="/" || $NF=="/var" || $NF=="/opt" || $NF=="/home"'
echo "=== KEY SERVICES & RUNTIMES ==="
command -v docker >/dev/null 2>&1 && echo "Docker: $(docker --version 2>/dev/null)" || echo "Docker: Not installed"
command -v node >/dev/null 2>&1 && echo "NodeJS: $(node -v 2>/dev/null)" || echo "NodeJS: Not installed"
command -v python3 >/dev/null 2>&1 && echo "Python: $(python3 --version 2>/dev/null)" || echo "Python: Not installed"
command -v nginx >/dev/null 2>&1 && echo "Nginx: $(nginx -v 2>&1)" || echo "Nginx: Not installed"
command -v mysqld >/dev/null 2>&1 || command -v mariadb >/dev/null 2>&1 && echo "MySQL/MariaDB: Installed" || echo "MySQL/MariaDB: Not installed"
echo "=== LISTENING PORTS ==="
ss -tulpn 2>/dev/null | grep LISTEN | awk '{print $1, $5}' | head -n 8 || netstat -tulpn 2>/dev/null | grep LISTEN | head -n 8
`.trim();

      const res = await sshService.executeCommand(server, inspectCmd, key);
      return {
        success: res.success,
        info: res.output || res.error || 'No telemetry output',
        error: res.error
      };
    } catch (err: any) {
      return {
        success: false,
        info: '',
        error: err.message || 'Inspection failed'
      };
    }
  });

  ipcMain.handle('playbook:execute-step', async (_, { server, command, key, vaultConfig }) => {
    const startTime = Date.now();
    try {
      if (server.authType === 'hashicorpVault' && server.vaultSecretPath && vaultConfig) {
        const vaultRes = await hashicorpVaultService.fetchSecret(vaultConfig, server.vaultSecretPath, server.vaultKeyName || 'password');
        if (vaultRes.success && vaultRes.secret) {
          server.password = vaultRes.secret;
        }
      }
      const res = await sshService.executeCommand(server, command, key);
      return {
        success: res.success,
        output: res.output || '',
        error: res.error,
        executionTimeMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        output: '',
        error: err.message || 'Lỗi thực thi bước Playbook',
        executionTimeMs: Date.now() - startTime
      };
    }
  });
};
