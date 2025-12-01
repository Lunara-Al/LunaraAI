import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export type SyncEvent = 
  | { type: 'user-updated'; userId: string; data: any }
  | { type: 'profile-updated'; userId: string; data: any }
  | { type: 'video-generated'; userId: string; videoId: number }
  | { type: 'video-deleted'; userId: string; videoId: number }
  | { type: 'membership-updated'; userId: string; tier: string }
  | { type: 'settings-updated'; userId: string; settings: any }
  | { type: 'credits-updated'; userId: string; credits: number };

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/api/sync' });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientConnection: ClientConnection = { ws };
      this.clients.set(ws, clientConnection);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'identify') {
            const client = this.clients.get(ws);
            if (client) {
              client.userId = data.userId;
            }
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  broadcast(event: SyncEvent) {
    const message = JSON.stringify(event);
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send to all clients of the same user, or to specific user if needed
        if (event.type === 'user-updated' || 
            event.type === 'profile-updated' || 
            event.type === 'membership-updated' ||
            event.type === 'credits-updated') {
          // Send to all devices of this user
          if (client.userId === event.userId) {
            client.ws.send(message);
          }
        } else {
          // Send to all devices of this user
          if (client.userId === event.userId) {
            client.ws.send(message);
          }
        }
      }
    });
  }

  broadcastToUser(userId: string, event: SyncEvent) {
    const message = JSON.stringify(event);
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN && client.userId === userId) {
        client.ws.send(message);
      }
    });
  }

  getConnectedClientCount(): number {
    return this.clients.size;
  }
}

export let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: Server): WebSocketManager {
  wsManager = new WebSocketManager(server);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
