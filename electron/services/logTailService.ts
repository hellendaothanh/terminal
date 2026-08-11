import { Client, utils } from 'ssh2';
import { ServerConfig, SSHKey } from '../../src/types';
import { WebContents } from 'electron';

interface ActiveStream {
  streamId: string;
  clients: Client[];
  status: 'ACTIVE' | 'CONNECTING' | 'ERROR' | 'STOPPED';
  error?: string;
}

export class LogTailService {
  private activeStreams: Map<string, ActiveStream> = new Map();

  public async startStream(
    streamId: string,
    serverChain: ServerConfig[],
    keyChain: SSHKey[],
    filePath: string,
    sender: WebContents
  ): Promise<{ success: boolean; error?: string }> {
    if (this.activeStreams.has(streamId)) {
      await this.stopStream(streamId);
    }

    return new Promise(async (resolve) => {
      const activeStream: ActiveStream = {
        streamId,
        clients: [],
        status: 'CONNECTING'
      };

      this.activeStreams.set(streamId, activeStream);

      try {
        let previousStream: any = null;
        let finalClient: Client | null = null;

        for (let i = 0; i < serverChain.length; i++) {
          const server = serverChain[i];
          const key = keyChain[i];
          
          const connectConfig: any = {
            host: server.host,
            port: server.port || 22,
            username: server.username,
            readyTimeout: 20000,
            keepaliveInterval: 10000,
            tryKeyboard: true,
            sock: previousStream
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
                  throw new Error('Cannot parse privateKey: ' + err.message);
                }
              } else {
                throw new Error('Private Key yêu cầu Passphrase.');
              }
            }
            connectConfig.privateKey = key.privateKey;
            if (needPassphrase && key.passphrase) {
              connectConfig.passphrase = key.passphrase;
            }
          } else if (server.password) {
            connectConfig.password = server.password;
          }

          const client = new Client();
          activeStream.clients.push(client);

          await new Promise<void>((resolveStep, rejectStep) => {
            client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
              finish(prompts.map(() => server.password || ''));
            });

            client.on('error', (err) => {
              rejectStep(err);
            });

            client.on('ready', () => {
              resolveStep();
            });

            client.connect(connectConfig);
          });

          if (i < serverChain.length - 1) {
            const nextServer = serverChain[i + 1];
            previousStream = await new Promise((resolveForward, rejectForward) => {
              client.forwardOut('127.0.0.1', 0, nextServer.host, nextServer.port || 22, (err, stream) => {
                if (err) return rejectForward(err);
                resolveForward(stream);
              });
            });
          } else {
            finalClient = client;
          }
        }

        if (!finalClient) throw new Error('No final SSH client established');

        activeStream.status = 'ACTIVE';

        // Execute tail -f
        finalClient.exec(`tail -n 200 -f "${filePath}"`, (err, stream) => {
          if (err) {
            this.handleError(activeStream, err.message, sender);
            return resolve({ success: false, error: err.message });
          }

          resolve({ success: true });

          stream.on('data', (data: any) => {
            if (!sender.isDestroyed()) {
              sender.send('log-stream-data', { streamId, data: data.toString() });
            }
          });

          stream.stderr.on('data', (data: any) => {
            if (!sender.isDestroyed()) {
              sender.send('log-stream-data', { streamId, data: data.toString() });
            }
          });

          stream.on('close', () => {
            this.cleanupStream(activeStream);
          });
        });

      } catch (err: any) {
        this.handleError(activeStream, err.message, sender);
        resolve({ success: false, error: err.message });
      }
    });
  }

  private handleError(activeStream: ActiveStream, errorMsg: string, sender?: WebContents) {
    activeStream.status = 'ERROR';
    activeStream.error = errorMsg;
    this.cleanupStream(activeStream);
    if (sender && !sender.isDestroyed()) {
      sender.send('log-stream-data', { streamId: activeStream.streamId, data: `\n[LogTailService ERROR]: ${errorMsg}\n` });
    }
  }

  private cleanupStream(activeStream: ActiveStream) {
    activeStream.clients.forEach(c => c.end());
    activeStream.status = 'STOPPED';
  }

  public async stopStream(streamId: string): Promise<{ success: boolean }> {
    const active = this.activeStreams.get(streamId);
    if (!active) return { success: true };
    this.cleanupStream(active);
    this.activeStreams.delete(streamId);
    return { success: true };
  }
}
