import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import tokenRoutes from './routes/tokenRoutes.js';
import { setIoInstance } from './controllers/tokenController.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

setIoInstance(io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', tokenRoutes);

// Health check and root API route
app.get('/api', (_req, res) => {
  res.json({
    message: 'Mirai Orientation 2026 Live Token System API',
    status: 'online',
    frontend: 'http://localhost:5173/',
    endpoints: {
      tokens: '/api/tokens',
      smartboardData: '/api/tokens/current',
      stats: '/api/tokens/stats',
      health: '/api/health',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket.IO connections
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5001;

// MongoDB Connection with Memory Server Fallback
const connectDB = async () => {
  const localUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mirai_orientation_2026';
  try {
    console.log(`[Database] Attempting connection to local MongoDB at ${localUri}...`);
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    console.log('[Database] Connected successfully to local MongoDB instance.');
  } catch (err) {
    console.warn('[Database] Local MongoDB connection failed or timed out. Initializing MongoDB Memory Server fallback...');
    const mongoMemory = await MongoMemoryServer.create();
    const memoryUri = mongoMemory.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[Database] Connected successfully to MongoDB Memory Server at ${memoryUri}`);
  }
};

if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`Mirai Orientation 2026 Server running on port ${PORT}`);
        console.log(`API URL: http://localhost:${PORT}/api`);
        console.log(`====================================================`);
      });
    })
    .catch((err) => {
      console.error('[Fatal] Failed to start server:', err);
    });
}

export { app, server };
export default app;

