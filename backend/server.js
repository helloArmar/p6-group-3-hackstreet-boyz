import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';
import { initSocket } from './utils/socket.js';
import { scheduleRentDueReminders } from './utils/rentReminders.js';
import { verifyMailer } from './utils/mailer.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import unitRoutes from './routes/unitRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import leaseRoutes from './routes/leaseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import billRoutes from './routes/billRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Fail fast rather than signing tokens with `undefined`.
if (!process.env.JWT_SECRET) {
  console.error(
    'JWT_SECRET is not set. Copy .env.example to .env and fill it in.',
  );
  process.exit(1);
}

app.use(helmet());
app.use(
  cors({
    origin: 'https://p6-group-3-hackstreet-boyz-1.onrender.com',
    credentials: true,
  }),
);
// Default 100kb is too small for a base64-encoded file riding along in the
// JSON body (see Payment.proof and Message.attachment).
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

await connectDB();

app.get('/api/health', (_req, res) => {
  res
    .status(200)
    .json({ success: true, status: 'ok', uptime: process.uptime() });
});

const routes = [
  ['/auth', authRoutes],
  ['/users', userRoutes],
  ['/properties', propertyRoutes],
  ['/units', unitRoutes],
  ['/tenants', tenantRoutes],
  ['/leases', leaseRoutes],
  ['/payments', paymentRoutes],
  ['/maintenance', maintenanceRoutes],
  ['/bills', billRoutes],
  ['/dashboard', dashboardRoutes],
  ['/messages', messageRoutes],
];

// Primary mount matches the proposal's endpoint table (/api/...).
// /api/v1 is kept as an alias so the team's existing Postman collections
// keep working. See ADR-001 item 6.
for (const [path, router] of routes) {
  app.use(`/api${path}`, router);
  app.use(`/api/v1${path}`, router);
}

app.use(notFound);
app.use(errorHandler);

// Socket.IO needs the raw HTTP server (it handles the WebSocket upgrade
// itself), so Express no longer listens directly.
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`RentEase API listening on http://localhost:${PORT}`);

  // Verify SMTP when the server starts.
  await verifyMailer();
});

// Start rent reminder cron.
scheduleRentDueReminders();

export default app;
