import { Server } from 'socket.io';
import User from '../models/User.js';
import { verifyToken } from './token.js';
import { resolveTenantConversation, resolveLandlordConversation } from './messageAuth.js';

let io = null;

// Rooms:
//   user:<userId>     — this user's personal room, for "your thread list
//                        changed" nudges regardless of which chat is open
//   role:admin        — every connected admin, since any admin may pick up
//                        any landlord conversation
//   tenant:<tenantId> — a landlord<->tenant conversation
//   landlord:<userId> — an admin<->landlord conversation
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Same rule as the REST `protect` middleware: verify the JWT and load the
  // live user, so a soft-deleted or role-changed account loses access
  // immediately rather than when its token expires.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('No token');

      const payload = verifyToken(token);
      const user = await User.findOne({ _id: payload.sub, isDeleted: false }).select('-password');
      if (!user) throw new Error('Account no longer active');

      socket.user = user;
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user._id}`);
    if (socket.user.role === 'admin') socket.join('role:admin');

    // Joining a conversation room is authorized with the exact same rules
    // as the REST endpoints (shared helpers in utils/messageAuth.js).
    socket.on('conversation:join', async ({ tenant, landlord } = {}, ack) => {
      try {
        if (tenant) {
          await resolveTenantConversation(socket.user, tenant);
          socket.join(`tenant:${tenant}`);
        } else if (landlord) {
          await resolveLandlordConversation(socket.user, landlord);
          socket.join(`landlord:${landlord}`);
        }
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on('conversation:leave', ({ tenant, landlord } = {}) => {
      if (tenant) socket.leave(`tenant:${tenant}`);
      if (landlord) socket.leave(`landlord:${landlord}`);
    });
  });

  return io;
};

// Controllers call this to push events after a mutation — undefined until
// initSocket() has run, so callers guard with `if (io) { ... }`.
export const getIO = () => io;
