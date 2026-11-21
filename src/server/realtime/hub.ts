import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import type { RealtimeEvent } from '../../types/index';
import { parseCookieToken, verifySessionToken } from '../auth/crypto';

interface AuthedSocket extends WebSocket {
  userId?: string;
  spaceId?: string;
  isAlive?: boolean;
}

interface SseClient {
  userId: string;
  spaceId: string;
  res: Response;
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private sseClients = new Set<SseClient>();
  private wsAttached = false;

  isWsAttached(): boolean {
    return this.wsAttached;
  }

  attach(server: HttpServer): void {
    if (this.wss) return;
    this.wsAttached = true;
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
        authed.spaceId = session.spaceId || 'primary-space';
        authed.isAlive = true;
        this.wss?.emit('connection', authed, req);
      });
    });

    this.wss.on('connection', (ws: AuthedSocket) => {
      const spaceId = ws.spaceId || 'primary-space';
      this.broadcastPresence(spaceId);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.broadcastPresence(spaceId);
      });

      ws.on('error', () => {
        this.broadcastPresence(spaceId);
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

  registerSse(userId: string, spaceId: string, res: Response): () => void {
    const client: SseClient = { userId, spaceId, res };
    this.sseClients.add(client);
    this.broadcastPresence(spaceId);

    return () => {
      this.sseClients.delete(client);
      this.broadcastPresence(spaceId);
    };
  }

  getOnlineUserIds(spaceId: string): string[] {
    const ids = new Set<string>();
    if (this.wss) {
      for (const client of this.wss.clients) {
        const authed = client as AuthedSocket;
        if (
          authed.readyState === WebSocket.OPEN &&
          authed.userId &&
          (authed.spaceId || 'primary-space') === spaceId
        ) {
          ids.add(authed.userId);
        }
      }
    }
    for (const client of this.sseClients) {
      if (client.spaceId === spaceId) {
        ids.add(client.userId);
      }
    }
    return Array.from(ids);
  }

  broadcastPresence(spaceId: string): void {
    this.broadcast(spaceId, {
      type: 'presence:update',
      payload: { onlineUserIds: this.getOnlineUserIds(spaceId) },
    });
  }

  broadcast(spaceId: string, event: RealtimeEvent): void {
    const serialized = JSON.stringify(event);
    if (this.wss) {
      for (const client of this.wss.clients) {
        const authed = client as AuthedSocket;
        if (
          authed.readyState === WebSocket.OPEN &&
          (authed.spaceId || 'primary-space') === spaceId
        ) {
          authed.send(serialized);
        }
      }
    }
    for (const client of this.sseClients) {
      if (client.spaceId === spaceId) {
        client.res.write(`data: ${serialized}\n\n`);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
