import { Server } from 'socket.io';
import { verifyToken } from './controllers/auth.controller.js'; // Let's check if verifyToken is exported

let io;

export function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Keep loose for hackathon
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join', async (data) => {
      try {
        const { merchantId } = data; // For simplicity in hackathon, frontend can just pass merchantId directly, or token. Let's just use merchantId for now since auth might be simple.
        if (!merchantId) return;

        const room = `merchant_${merchantId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      } catch (err) {
        console.error('Socket join error:', err.message);
      }
    });
  });

  return io;
}

export function emitDashboardUpdate(merchantId) {
  if (!io || !merchantId) return;
  const room = `merchant_${merchantId.toString()}`;
  io.to(room).emit('dashboard_update', { timestamp: Date.now() });
}
