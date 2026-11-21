import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import type { RealtimeEvent } from '../../types/index';
import { parseCookieToken, verifySessionToken } from '../auth/crypto';

interface AuthedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private sseClients = new Map<string, Set<Response>>();

  attach(server: HttpServer): void {
    if (this.wss) return;
    this.wss = new WebSocketServer({
      noServer: true,
      handleProtocols: (protocols) => (protocols.has('ols-auth') ? 'ols-auth' : false),
    });

    server.on('upgrade', (req: IncomingMessage, socket, head) => {
      const url = req.url || '';
      if (!url.startsWith('/ws')) {
        return; // Allow Vite/other handlers if any
      }

      let token: string | null = null;
      const protoHeader = req.headers['sec-websocket-protocol'];
      if (typeof protoHeader === 'string') {
        const parts = protoHeader.split(',').map((s) => s.trim());
        if (parts[0] === 'ols-auth' && parts[1]) {
          token = parts[1];
        }
      }
      if (!token) {
        token = parseCookieToken(req.headers.cookie);
      }

      const session = verifySessionToken(token);
      if (!session) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss?.handleUpgrade(req, socket, head, (ws) => {
        const authed = ws as AuthedSocket;
        authed.userId = session.sub;
        authed.isAlive = true;
        this.wss?.emit('connection', authed, req);
      });
    });

    this.wss.on('connection', (ws: AuthedSocket) => {
      this.broadcastPresence();

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.broadcastPresence();
      });

      ws.on('error', () => {
        this.broadcastPresence();
      });
    });

    const interval = setInterval(() => {
      if (!this.wss) return;
      for (const client of this.wss.clients) {
        const authed = client as AuthedSocket;
        if (authed.isAlive === false) {
          authed.terminate();
          continue;
        }
        authed.isAlive = false;
        authed.ping();
      }
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
  }

  registerSse(userId: string, res: Response): () => void {
    let set = this.sseClients.get(userId);
    if (!set) {
      set = new Set();
      this.sseClients.set(userId, set);
    }
    set.add(res);
    this.broadcastPresence();

    return () => {
      set?.delete(res);
      if (set && set.size === 0) {
        this.sseClients.delete(userId);
      }
      this.broadcastPresence();
    };
  }

  getOnlineUserIds(): string[] {
    const ids = new Set<string>();
    if (this.wss) {
      for (const client of this.wss.clients) {
        const authed = client as AuthedSocket;
        if (authed.readyState === WebSocket.OPEN && authed.userId) {
          ids.add(authed.userId);
        }
      }
    }
    for (const [userId, set] of this.sseClients.entries()) {
      if (set.size > 0) ids.add(userId);
    }
    return Array.from(ids);
  }

  broadcastPresence(): void {
    this.broadcast({
      type: 'presence:update',
      payload: { onlineUserIds: this.getOnlineUserIds() },
    });
  }

  broadcast(event: RealtimeEvent): void {
    const serialized = JSON.stringify(event);
    if (this.wss) {
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(serialized);
        }
      }
    }
    for (const set of this.sseClients.values()) {
      for (const res of set) {
        res.write(`data: ${serialized}\n\n`);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
