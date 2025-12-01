import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from './useAuth';

type SyncEvent = 
  | { type: 'user-updated'; userId: string; data: any }
  | { type: 'profile-updated'; userId: string; data: any }
  | { type: 'video-generated'; userId: string; videoId: number }
  | { type: 'video-deleted'; userId: string; videoId: number }
  | { type: 'membership-updated'; userId: string; tier: string }
  | { type: 'settings-updated'; userId: string; settings: any }
  | { type: 'credits-updated'; userId: string; credits: number };

export function useRealtimeSync() {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/sync`);

        ws.onopen = () => {
          wsRef.current = ws;
          // Send identify message with user ID
          ws.send(JSON.stringify({ type: 'identify', userId: user.id }));
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const syncEvent: SyncEvent = JSON.parse(event.data);

            // Only process events for the current user
            if (syncEvent.userId !== user.id) return;

            // Invalidate appropriate cache based on event type
            switch (syncEvent.type) {
              case 'user-updated':
              case 'profile-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
                break;
              
              case 'video-generated':
              case 'video-deleted':
                queryClient.invalidateQueries({ queryKey: ['/api/history'] });
                queryClient.invalidateQueries({ queryKey: ['/api/history', user.id] });
                queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                break;
              
              case 'membership-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
                break;
              
              case 'credits-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                break;
              
              case 'settings-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
                break;
            }
          } catch (error) {
            console.error('Failed to parse sync event:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws.close();
        };

        ws.onclose = () => {
          wsRef.current = null;
          // Attempt to reconnect after 3 seconds
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.id]);
}
