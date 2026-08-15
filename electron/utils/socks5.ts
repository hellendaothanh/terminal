import net from 'net';

export interface SocksInfo {
  srcAddr: string;
  srcPort: number;
  dstAddr: string;
  dstPort: number;
}

export function createSocksServer(
  connectionListener: (
    info: SocksInfo,
    accept: (rawSocket?: boolean) => net.Socket,
    reject: () => void
  ) => void
): net.Server & { useAuth: () => any } {
  const server = net.createServer((socket) => {
    let phase = 'handshake';
    let requestBuffer = Buffer.alloc(0);

    socket.on('data', (rawChunk) => {
      try {
        const data = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
        if (phase === 'handshake') {
          if (data.length < 2) {
            socket.end();
            return;
          }
          const version = data[0];
          
          // Handle SOCKS4
          if (version === 4) {
            const cmd = data[1];
            if (cmd !== 1 || data.length < 8) {
              socket.end();
              return;
            }
            const dstPort = data.readUInt16BE(2);
            const ipBytes = data.slice(4, 8);
            const dstAddr = `${ipBytes[0]}.${ipBytes[1]}.${ipBytes[2]}.${ipBytes[3]}`;
            
            const info: SocksInfo = {
              srcAddr: socket.remoteAddress || '127.0.0.1',
              srcPort: socket.remotePort || 0,
              dstAddr,
              dstPort,
            };

            const accept = (rawSocket?: boolean) => {
              const response = Buffer.from([0, 0x5a, 0, 0, 0, 0, 0, 0]);
              socket.write(response);
              socket.removeAllListeners('data');
              return socket;
            };

            const reject = () => {
              const response = Buffer.from([0, 0x5b, 0, 0, 0, 0, 0, 0]);
              socket.write(response);
              socket.end();
            };

            connectionListener(info, accept, reject);
            return;
          }

          // Handle SOCKS5
          if (version !== 5) {
            socket.end();
            return;
          }

          // Reply with No Authentication required
          socket.write(Buffer.from([5, 0]));
          phase = 'request';
        } else if (phase === 'request') {
          requestBuffer = Buffer.concat([requestBuffer, data]);
          
          if (requestBuffer.length < 7) return;
          const version = requestBuffer[0];
          const cmd = requestBuffer[1];
          const atyp = requestBuffer[3];

          if (version !== 5 || cmd !== 1) {
            socket.end();
            return;
          }

          let offset = 4;
          let dstAddr = '';
          if (atyp === 1) {
            // IPv4
            if (requestBuffer.length < 10) return;
            dstAddr = `${requestBuffer[offset]}.${requestBuffer[offset + 1]}.${requestBuffer[offset + 2]}.${requestBuffer[offset + 3]}`;
            offset += 4;
          } else if (atyp === 3) {
            // Domain Name
            const len = requestBuffer[offset];
            if (requestBuffer.length < offset + 1 + len + 2) return;
            dstAddr = requestBuffer.toString('utf8', offset + 1, offset + 1 + len);
            offset += 1 + len;
          } else if (atyp === 4) {
            // IPv6
            if (requestBuffer.length < 22) return;
            const parts = [];
            for (let i = 0; i < 16; i += 2) {
              parts.push(requestBuffer.readUInt16BE(offset + i).toString(16));
            }
            dstAddr = parts.join(':');
            offset += 16;
          } else {
            socket.end();
            return;
          }

          if (requestBuffer.length < offset + 2) return;
          const dstPort = requestBuffer.readUInt16BE(offset);
          const rawRequest = requestBuffer.slice(0, offset + 2);

          const info: SocksInfo = {
            srcAddr: socket.remoteAddress || '127.0.0.1',
            srcPort: socket.remotePort || 0,
            dstAddr,
            dstPort,
          };

          const accept = (rawSocket?: boolean) => {
            const response = Buffer.alloc(rawRequest.length);
            rawRequest.copy(response);
            response[1] = 0; // Success status
            socket.write(response);
            socket.removeAllListeners('data');
            return socket;
          };

          const reject = () => {
            const response = Buffer.alloc(rawRequest.length);
            rawRequest.copy(response);
            response[1] = 1; // Failure status
            socket.write(response);
            socket.end();
          };

          connectionListener(info, accept, reject);
        }
      } catch (err) {
        socket.destroy();
      }
    });

    socket.on('error', () => {
      socket.destroy();
    });
  });

  // Expose a dummy useAuth method to retain compatibility with socksv5 interface
  (server as any).useAuth = () => server;

  return server as net.Server & { useAuth: () => any };
}
