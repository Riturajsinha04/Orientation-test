"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const tokenRoutes_js_1 = __importDefault(require("./routes/tokenRoutes.js"));
const tokenController_js_1 = require("./controllers/tokenController.js");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
});
(0, tokenController_js_1.setIoInstance)(io);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api', tokenRoutes_js_1.default);
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
        await mongoose_1.default.connect(localUri, { serverSelectionTimeoutMS: 2000 });
        console.log('[Database] Connected successfully to local MongoDB instance.');
    }
    catch (err) {
        console.warn('[Database] Local MongoDB connection failed or timed out. Initializing MongoDB Memory Server fallback...');
        const mongoMemory = await mongodb_memory_server_1.MongoMemoryServer.create();
        const memoryUri = mongoMemory.getUri();
        await mongoose_1.default.connect(memoryUri);
        console.log(`[Database] Connected successfully to MongoDB Memory Server at ${memoryUri}`);
    }
};
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
    process.exit(1);
});
