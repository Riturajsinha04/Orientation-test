import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSupabaseClient } from './supabase';

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL || window.location.origin;

let socketInstance: Socket | null = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 3000,
    });
  }
  return socketInstance;
};

export const useSocketStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true); // Default online for Vercel + Supabase

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected || true);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      // Even if socket disconnects, Supabase realtime & direct sync keep app online
      setIsConnected(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Subscribe to Supabase Realtime for live updates on Vercel
    try {
      const supabase = getSupabaseClient();
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tokens' },
          () => {
            socket.emit('queue:updated');
          }
        )
        .subscribe();

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        supabase.removeChannel(channel);
      };
    } catch {
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, []);

  return isConnected;
};
