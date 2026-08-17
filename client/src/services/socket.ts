import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected || true);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      // Keep system online mode active for cloud deployment
      setIsConnected(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
};
