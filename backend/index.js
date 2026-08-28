import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import authRoutes from './src/routes/auth.routes.js';
import crmRoutes from './src/routes/crm.routes.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON request bodies (Required for POST requests)
app.use(express.json());
app.set('json spaces', 2);

// Mount the authentication routes
app.use('/api/auth', authRoutes);
app.use('/api', crmRoutes); // Handles both /api/inventory and /api/orders
// Health check route (Step 3 in your Design Guide)
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

// Database connection and server initialization
const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from your .env file.');
    }

    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`❌ Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();