/** Keywords scanned in terminal output to raise anomaly alerts. */
export const ANOMALY_KEYWORDS = [
  'option requires an argument',
  'requires an argument',
  'unrecognized option',
  'invalid option',
  'invalid argument',
  'syntax error',
  'SyntaxError',
  'command not found',
  'not found',
  'no such file or directory',
  'No such file or directory',
  'Permission denied',
  'Permission Denied',
  'permission denied',
  'Access denied',
  'Access Denied',
  'OutOfMemory',
  'Out of memory',
  'OOMKilled',
  'Connection Refused',
  'Connection refused',
  'Segmentation Fault',
  'segmentation fault',
  'FATAL ERROR',
  'Panic: ',
  'Uncaught Exception',
  'Cannot find module',
  'is not recognized as an internal or external command',
  'fatal:',
  'FAILED',
  'failed to start',
  'Unit not found',
  'could not find unit'
];

/** Destructive command fragments used by risk detection. */
export const HIGH_RISK_COMMANDS = ['rm -rf', 'drop database', 'drop table', 'truncate', 'chmod 777', 'mkfs', 'dd if=', 'shutdown', 'reboot', 'systemctl stop'];

/** Baseline suggestions for the ghost-text inline autocomplete. */
export const COMMON_CMD_LIST = [
  'ping -c 4 8.8.8.8',
  'ping -c 4 google.com',
  'df -h',
  'free -h',
  'uptime',
  'ip a',
  'ss -tulpn',
  'netstat -tulpn',
  'top -b -n 1',
  'htop',
  'cat /etc/os-release',
  'uname -a',
  'journalctl -xe --no-pager -n 50',
  'journalctl -xe',
  'systemctl status',
  'systemctl list-units --type=service --state=running',
  'docker ps -a',
  'docker stats --no-stream',
  'docker-compose ps',
  'docker-compose up -d',
  'kubectl get pods -A',
  'kubectl get nodes -o wide',
  'tail -n 50 /var/log/syslog',
  'tail -n 50 /var/log/messages',
  'tail -n 50 /var/log/nginx/error.log',
  'ps aux --sort=-%mem | head -n 10',
  'ps aux --sort=-%cpu | head -n 10',
  'whoami',
  'id',
  'pwd',
  'ls -la'
];

/**
 * Scan a chunk of terminal output against known error keywords.
 * Returns the first matched keyword, or null when output looks clean.
 */
export const findAnomalyKeyword = (text: string): string | null => {
  for (const kw of ANOMALY_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
};

/**
 * Classify a command line risk level from HIGH_RISK_COMMANDS.
 */
export const checkDangerousCommand = (cmd: string): 'HIGH' | 'MEDIUM' | null => {
  const lower = cmd.toLowerCase();
  if (HIGH_RISK_COMMANDS.some((kw) => lower.includes(kw))) return 'HIGH';
  return null;
};
