import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import whatsappRoutes from './src/routes/whatsapp.route.js';
import authRoutes from './src/routes/auth.routes.js';
import crmRoutes from './src/routes/crm.routes.js';
import approvalRoutes from './src/routes/approval.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import workflowRoutes from './src/routes/workflow.routes.js';
import { startScheduleRunner } from './src/workflows/workflow.service.js';

const app = express();

app.use(cors());

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

const PORT = process.env.PORT || 8080;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    startScheduleRunner();
  })
  .catch((err) => console.error('MongoDB connection failed:', err.message));

app.listen(PORT, () => console.log(`VerbaTask backend listening on :${PORT}`));

export default app;