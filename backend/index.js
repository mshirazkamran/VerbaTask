import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import whatsappRoutes from './src/routes/whatsapp.route.js';
import authRoutes from './src/routes/auth.route.js';
// TODO: uncomment each pair as the route file lands — importing them before
// the files exist crashes the whole server at startup (ERR_MODULE_NOT_FOUND).
// import onboardingRoutes from './src/routes/onboarding.route.js';
// import inventoryRoutes from './src/routes/inventory.route.js';
// import workflowRoutes from './src/routes/workflow.route.js';
// import ocrRoutes from './src/routes/ocr.route.js';
// import dashboardRoutes from './src/routes/dashboard.route.js';

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

app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/api/auth', authRoutes);
// TODO: mount these once their route files exist:
// app.use('/api/onboarding', onboardingRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/workflows', workflowRoutes);
// app.use('/api/ocr', ocrRoutes);
// app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 8080;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection failed:', err.message));

app.listen(PORT, () => console.log(`VerbaTask backend listening on :${PORT}`));

export default app;
