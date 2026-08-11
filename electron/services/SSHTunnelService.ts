import net from 'net';
import { Client, utils } from 'ssh2';
import socksv5 from 'socksv5';
import { ServerConfig, SSHKey, SSHTunnelConfig, TunnelTrafficStats } from '../../src/types';

interface ActiveTunnel {
  config: SSHTunnelConfig;
  client: Client;
  localServer?: net.Server;
  socksServer?: any;
  bytesRead: number;
  bytesWritten: number;
  lastBytesRead: number;
  lastBytesWritten: number;
  speedKbps: number;
  activeConnections: number;
  status: 'ACTIVE' | 'CONNECTING' | 'ERROR' | 'STOPPED';
  error?: string;
}

export class SSHTunnelService {
  private activeTunnels: Map<string, ActiveTunnel> = new Map();
  private statsTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.statsTimer = setInterval(() => {
      this.activeTunnels.forEach((tunnel) => {
        const deltaRead = tunnel.bytesRead - tunnel.lastBytesRead;
        const deltaWritten = tunnel.bytesWritten - tunnel.lastBytesWritten;
        tunnel.speedKbps = Math.round(((deltaRead + deltaWritten) * 8) / 1024);
        tunnel.lastBytesRead = tunnel.bytesRead;
        tunnel.lastBytesWritten = tunnel.bytesWritten;
      });
    }, 1000);
  }

  public async startTunnel(
    config: SSHTunnelConfig,
    server: ServerConfig,
    key?: SSHKey
  ): Promise<{ success: boolean; error?: string }> {
    if (this.activeTunnels.has(config.id)) {
      await this.stopTunnel(config.id);
    }

    return new Promise((resolve) => {
      const client = new Client();

      const activeTunnel: ActiveTunnel = {
        config,
        client,
        bytesRead: 0,
        bytesWritten: 0,
        lastBytesRead: 0,
        lastBytesWritten: 0,
        speedKbps: 0,
        activeConnections: 0,
        status: 'CONNECTING'
      };

      this.activeTunnels.set(config.id, activeTunnel);

      const connectConfig: any = {
        host: server.host,
        port: server.port || 22,
        username: server.username,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
        tryKeyboard: true
      };

      if (server.authType === 'privateKey' && key) {
        let needPassphrase = false;
        try {
          const parsed = utils.parseKey(key.privateKey);
          if (parsed instanceof Error) throw parsed;
        } catch (e) {
          if (key.passphrase) {
            try {
              const parsed = utils.parseKey(key.privateKey, key.passphrase);
              if (parsed instanceof Error) throw parsed;
              needPassphrase = true;
            } catch (err: any) {
              activeTunnel.status = 'ERROR';
              activeTunnel.error = err.message;
              return resolve({ success: false, error: 'Cannot parse privateKey: ' + err.message });
            }
          } else {
            activeTunnel.status = 'ERROR';
            activeTunnel.error = 'Key requires passphrase';
            return resolve({ success: false, error: 'Private Key yêu cầu Passphrase.' });
          }
        }
        connectConfig.privateKey = key.privateKey;
        if (needPassphrase && key.passphrase) {
          connectConfig.passphrase = key.passphrase;
        }
      } else if (server.password) {
        connectConfig.password = server.password;
      }

      client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        finish(prompts.map(() => server.password || ''));
      });

      client.on('error', (err) => {
        activeTunnel.status = 'ERROR';
        activeTunnel.error = err.message;
        resolve({ success: false, error: err.message });
      });

      client.on('ready', () => {
        activeTunnel.status = 'ACTIVE';

        if (config.mode === 'LOCAL') {
          this.setupLocalForward(activeTunnel, resolve);
        } else if (config.mode === 'REMOTE') {
          this.setupRemoteForward(activeTunnel, resolve);
        } else if (config.mode === 'DYNAMIC') {
          this.setupDynamicForward(activeTunnel, resolve);
        }
      });

      client.connect(connectConfig);
    });
  }

  private setupLocalForward(tunnel: ActiveTunnel, resolve: (res: any) => void) {
    const { config, client } = tunnel;
    const localHost = config.localHost || '127.0.0.1';
    const localPort = config.localPort;
    const dstHost = config.dstHost || '127.0.0.1';
    const dstPort = config.dstPort || 80;

    const server = net.createServer((socket) => {
      tunnel.activeConnections++;

      client.forwardOut(
        socket.remoteAddress || '127.0.0.1',
        socket.remotePort || 0,
        dstHost,
        dstPort,
        (err, stream) => {
          if (err) {
            tunnel.activeConnections = Math.max(0, tunnel.activeConnections - 1);
            socket.destroy();
            return;
          }

          socket.pipe(stream);
          stream.pipe(socket);

          socket.on('data', (data: Buffer) => {
            tunnel.bytesWritten += data.length;
          });

          stream.on('data', (data: Buffer) => {
            tunnel.bytesRead += data.length;
          });

          const cleanup = () => {
            tunnel.activeConnections = Math.max(0, tunnel.activeConnections - 1);
          };

          socket.on('close', cleanup);
          socket.on('error', cleanup);
          stream.on('close', cleanup);
          stream.on('error', cleanup);
        }
      );
    });

    server.listen(localPort, localHost, () => {
      tunnel.localServer = server;
      resolve({ success: true });
    });

    server.on('error', (err) => {
      tunnel.status = 'ERROR';
      tunnel.error = err.message;
      resolve({ success: false, error: `Local port error: ${err.message}` });
    });
  }

  private setupRemoteForward(tunnel: ActiveTunnel, resolve: (res: any) => void) {
    const { config, client } = tunnel;
    const remotePort = config.dstPort || config.localPort;
    const localHost = config.dstHost || config.localHost || '127.0.0.1';
    const localPort = config.localPort;

    client.forwardIn('0.0.0.0', remotePort, (err) => {
      if (err) {
        tunnel.status = 'ERROR';
        tunnel.error = err.message;
        return resolve({ success: false, error: `Remote forward error: ${err.message}` });
      }

      resolve({ success: true });
    });

    client.on('tcp connection', (info, accept, reject) => {
      tunnel.activeConnections++;
      const stream = accept();
      const socket = net.connect(localPort, localHost);

      stream.pipe(socket);
      socket.pipe(stream);

      stream.on('data', (data: Buffer) => {
        tunnel.bytesRead += data.length;
      });

      socket.on('data', (data: Buffer) => {
        tunnel.bytesWritten += data.length;
      });

      const cleanup = () => {
        tunnel.activeConnections = Math.max(0, tunnel.activeConnections - 1);
      };

      stream.on('close', cleanup);
      stream.on('error', cleanup);
      socket.on('close', cleanup);
      socket.on('error', cleanup);
    });
  }

  private setupDynamicForward(tunnel: ActiveTunnel, resolve: (res: any) => void) {
    const { config, client } = tunnel;
    const localHost = config.localHost || '127.0.0.1';
    const localPort = config.localPort;

    try {
      const socksServer = socksv5.createServer((info: any, accept: any, reject: any) => {
        tunnel.activeConnections++;
        client.forwardOut(
          info.srcAddr,
          info.srcPort,
          info.dstAddr,
          info.dstPort,
          (err, stream) => {
            if (err) {
              tunnel.activeConnections = Math.max(0, tunnel.activeConnections - 1);
              return reject();
            }

            const socket = accept(true); // Accept TCP connection
            if (!socket) return;

            socket.pipe(stream);
            stream.pipe(socket);

            socket.on('data', (data: Buffer) => {
              tunnel.bytesWritten += data.length;
            });

            stream.on('data', (data: Buffer) => {
              tunnel.bytesRead += data.length;
            });

            const cleanup = () => {
              tunnel.activeConnections = Math.max(0, tunnel.activeConnections - 1);
            };

            socket.on('close', cleanup);
            socket.on('error', cleanup);
            stream.on('close', cleanup);
            stream.on('error', cleanup);
          }
        );
      });

      socksServer.useAuth(socksv5.auth.None());

      socksServer.listen(localPort, localHost, () => {
        tunnel.socksServer = socksServer;
        resolve({ success: true });
      });

      socksServer.on('error', (err: any) => {
        tunnel.status = 'ERROR';
        tunnel.error = err.message;
        resolve({ success: false, error: `SOCKS5 error: ${err.message}` });
      });
    } catch (err: any) {
      tunnel.status = 'ERROR';
      tunnel.error = err.message;
      resolve({ success: false, error: err.message });
    }
  }

  public async stopTunnel(tunnelId: string): Promise<{ success: boolean }> {
    const active = this.activeTunnels.get(tunnelId);
    if (!active) return { success: true };

    if (active.localServer) {
      active.localServer.close();
    }
    if (active.socksServer) {
      active.socksServer.close();
    }
    active.client.end();
    active.status = 'STOPPED';

    this.activeTunnels.delete(tunnelId);
    return { success: true };
  }

  public getStats(): Record<string, TunnelTrafficStats> {
    const result: Record<string, TunnelTrafficStats> = {};
    this.activeTunnels.forEach((t, id) => {
      result[id] = {
        tunnelId: id,
        status: t.status,
        bytesRead: t.bytesRead,
        bytesWritten: t.bytesWritten,
        speedKbps: t.speedKbps,
        activeConnections: t.activeConnections,
        error: t.error
      };
    });
    return result;
  }
}
