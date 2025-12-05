const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const metaTrader = require('./services/metaTrader');
const pushService = require('./services/pushNotification');
const tradesRoutes = require('./routes/trades');
const telegramRoutes = require('./routes/telegram');
const pushRoutes = require('./routes/push');

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/trades', tradesRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Forex Signal API is running',
    metaTrader: metaTrader.isConnected ? 'connected' : 'disconnected',
    pushSubscriptions: pushService.getSubscriptionCount()
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);

  // Send current positions on connect
  socket.on('subscribe', async () => {
    if (metaTrader.isConnected) {
      const positions = await metaTrader.getOpenPositions();
      socket.emit('positions', positions);
    }
  });

  socket.on('disconnect', () => {
    console.log('📱 Client disconnected:', socket.id);
  });
});

// Helper function to get symbol name
function getSymbolName(symbol) {
  if (symbol?.includes('XAU')) return 'Gold';
  if (symbol?.includes('XAG')) return 'Silver';
  if (symbol?.includes('EUR')) return 'EUR/USD';
  if (symbol?.includes('GBP')) return 'GBP/USD';
  return symbol;
}

// Initialize MetaTrader and start server
async function startServer() {
  // Try to connect to MetaTrader
  const connected = await metaTrader.initialize();
  
  if (connected) {
    // Subscribe to real-time trade updates
    metaTrader.onTradeUpdate(async (event, data) => {
      console.log(`📊 Trade ${event}:`, data.symbol || data.id);
      
      // Emit to WebSocket clients
      io.emit('trade_update', { event, data });
      
      // Send push notification
      try {
        const symbolName = getSymbolName(data.symbol);
        
        if (event === 'position_opened') {
          const type = data.type?.includes('BUY') ? 'Buy' : 'Sell';
          await pushService.sendToAll(
            `🟢 ${symbolName} ${type}`,
            `Entry: ${data.openPrice} | Vol: ${data.volume}`,
            { type: 'trade_open', data }
          );
        } 
        else if (event === 'deal_closed') {
          const profit = data.profit >= 0 ? `+${data.profit.toFixed(2)}` : data.profit.toFixed(2);
          const emoji = data.profit >= 0 ? '✅' : '❌';
          await pushService.sendToAll(
            `${emoji} ${symbolName} Closed`,
            `P/L: ${profit}$ | Vol: ${data.volume}`,
            { type: 'trade_close', data }
          );
        }
        else if (event === 'position_updated') {
          // Only notify on significant updates (SL/TP changes)
          if (data.stopLoss || data.takeProfit) {
            await pushService.sendToAll(
              `📝 ${symbolName} Updated`,
              `SL: ${data.stopLoss || '-'} | TP: ${data.takeProfit || '-'}`,
              { type: 'trade_update', data }
            );
          }
        }
      } catch (err) {
        console.error('Push notification error:', err.message);
      }
    });
  }

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 MetaTrader: ${connected ? '✅ Connected' : '⚠️ Not configured'}`);
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await metaTrader.disconnect();
  process.exit(0);
});
