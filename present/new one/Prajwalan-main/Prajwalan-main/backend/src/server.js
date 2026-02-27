require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time queue updates
const wss = new WebSocketServer({ server });
const clients = new Map(); // userId => ws

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost`);
    const userId = url.searchParams.get('userId');
    if (userId) {
        clients.set(userId, ws);
        console.log(`🔌 WS connected: user ${userId}`);
    }
    ws.on('close', () => {
        if (userId) clients.delete(userId);
    });
});

// Broadcast to specific user
const notifyUser = (userId, payload) => {
    const ws = clients.get(userId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(payload));
    }
};

// Broadcast to all
const broadcastAll = (payload) => {
    clients.forEach((ws) => {
        if (ws.readyState === 1) ws.send(JSON.stringify(payload));
    });
};

// Attach to app for use in routes if needed
app.locals.notifyUser = notifyUser;
app.locals.broadcastAll = broadcastAll;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: '🏥 Q Nirvana API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/driver', require('./routes/driver'));

// 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Server Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n🏥 Q Nirvana Backend running on PORT ${PORT}`);
    console.log(`📡 WebSocket server active`);
    console.log(`🌐 API: http://localhost:${PORT}/api/health\n`);
});
