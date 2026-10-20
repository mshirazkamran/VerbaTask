import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import http from 'http';
import { initSocketIO } from './src/socket.js';

import whatsappRoutes from './src/routes/whatsapp.route.js';
import authRoutes from './src/routes/auth.routes.js';
import crmRoutes from './src/routes/crm.routes.js';
import approvalRoutes from './src/routes/approval.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import workflowRoutes from './src/routes/workflow.routes.js';
import merchantRoutes from './src/routes/merchant.routes.js';
import customerRoutes from './src/routes/customer.routes.js';
import { startScheduleRunner } from './src/workflows/workflow.service.js';

const app = express();

app.disable('x-powered-by');

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const allowedOrigins = [
  'https://verba-task.netlify.app',
  'https://verbatask.netlify.app',
  'https://boldukan.netlify.app',
  'https://boldukan.com',
  'https://www.boldukan.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile, curl, server-to-server)
      if (!origin) return callback(null, true);
      // In dev, allow localhost and any local IP
      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// The `verify` callback stashes the raw bytes on req.rawBody BEFORE express
// parses them into JSON — the WhatsApp signature is computed over those raw
// bytes, not the parsed object, so this has to happen at the parser level.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.set('json spaces', 2);
app.use(morgan('dev'));

// Routes
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', crmRoutes); // Handles both /api/inventory and /api/orders
app.use('/api/approvals', approvalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/customers', customerRoutes);

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
initSocketIO(server);

// Startup diagnostics: confirm critical env vars are loaded without leaking them.
function maskKey(key) {
  if (!key) return 'not set';
  if (key.length <= 12) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
console.log('GROQ_API_KEY loaded:', maskKey(process.env.GROQ_API_KEY));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    startScheduleRunner();
  })
  .catch((err) => console.error('MongoDB connection failed:', err.message));

server.listen(PORT, () => console.log(`VerbaTask backend listening on :${PORT}`));

export default app;