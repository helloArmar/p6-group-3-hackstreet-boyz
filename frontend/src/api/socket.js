import { io } from 'socket.io-client';
import { getToken } from './client.js';

let socket = null;

// One shared connection for the whole app, created after login and torn
// down on logout — components (MessagesPage) just import `getSocket()` and
// attach/detach listeners as they mount/unmount.
export const connectSocket = () => {
  if (socket) return socket;

  socket = io({
    path: '/socket.io',
    auth: (cb) => cb({ token: getToken() }),
    autoConnect: true,
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
