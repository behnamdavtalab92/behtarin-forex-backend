const MetaApi = require('metaapi.cloud-sdk').default;

class MetaTraderService {
  constructor() {
    this.api = null;
    this.account = null;
    this.connection = null;
    this.isConnected = false;
    this.knownPositions = new Set(); // Track known positions
  }

  async initialize() {
    try {
      const token = process.env.META_API_TOKEN;
      const accountId = process.env.MT_ACCOUNT_ID;

      if (!token || !accountId) {
        console.log('⚠️ MetaAPI credentials not configured');
        return false;
      }

      this.api = new MetaApi(token);
      this.account = await this.api.metatraderAccountApi.getAccount(accountId);

      // Wait for account to be deployed
      if (this.account.state !== 'DEPLOYED') {
        console.log('⏳ Deploying MT account...');
        await this.account.deploy();
        await this.account.waitDeployed();
      }

      // Connect to account
      this.connection = this.account.getStreamingConnection();
      await this.connection.connect();
      await this.connection.waitSynchronized();

      // Initialize known positions
      const positions = this.connection.terminalState.positions || [];
      positions.forEach(p => this.knownPositions.add(p.id));

      this.isConnected = true;
      console.log('✅ Connected to MetaTrader account');
      console.log(`📊 Found ${positions.length} open positions`);
      return true;

    } catch (error) {
      console.error('❌ MetaTrader connection error:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Get account info
  async getAccountInfo() {
    if (!this.isConnected) {
      return { error: 'Not connected to MetaTrader' };
    }

    try {
      const info = this.connection.terminalState.accountInformation;
      return {
        balance: info.balance,
        equity: info.equity,
        margin: info.margin,
        freeMargin: info.freeMargin,
        profit: info.profit,
        currency: info.currency,
        leverage: info.leverage,
        name: info.name,
        server: info.server,
        platform: info.platform
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Get open positions (active trades)
  async getOpenPositions() {
    if (!this.isConnected) {
      return [];
    }

    try {
      const positions = this.connection.terminalState.positions;
      return positions.map(pos => ({
        id: pos.id,
        symbol: pos.symbol,
        type: pos.type,
        volume: pos.volume,
        openPrice: pos.openPrice,
        currentPrice: pos.currentPrice,
        profit: pos.profit,
        swap: pos.swap,
        commission: pos.commission,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        openTime: pos.time,
        magic: pos.magic,
        comment: pos.comment
      }));
    } catch (error) {
      console.error('Error getting positions:', error);
      return [];
    }
  }

  // Get pending orders
  async getPendingOrders() {
    if (!this.isConnected) {
      return [];
    }

    try {
      const orders = this.connection.terminalState.orders;
      return orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        type: order.type,
        volume: order.volume,
        openPrice: order.openPrice,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        time: order.time,
        comment: order.comment
      }));
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  // Get trade history
  async getTradeHistory(days = 7) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - days);
      
      const history = await this.account.getHistoryOrdersByTimeRange(
        startTime,
        new Date()
      );

      return history.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        type: trade.type,
        volume: trade.volume,
        openPrice: trade.openPrice,
        closePrice: trade.closePrice,
        profit: trade.profit,
        swap: trade.swap,
        commission: trade.commission,
        openTime: trade.openTime,
        closeTime: trade.closeTime,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        comment: trade.comment
      }));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  // Subscribe to trade updates (real-time)
  onTradeUpdate(callback) {
    if (!this.connection) return;

    const self = this;

    this.connection.addSynchronizationListener({
      onPositionUpdated: (accountId, position) => {
        // Check if this is a NEW position
        const isNewPosition = !self.knownPositions.has(position.id);
        
        if (isNewPosition) {
          self.knownPositions.add(position.id);
          console.log(`🚀 NEW POSITION OPENED: ${position.symbol} ${position.type}`);
          callback('position_opened', {
            id: position.id,
            symbol: position.symbol,
            type: position.type,
            volume: position.volume,
            openPrice: position.openPrice,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            time: position.time
          });
        } else {
          // Existing position updated (SL/TP changed, etc)
          console.log(`📝 Position updated: ${position.symbol}`);
          callback('position_updated', {
            id: position.id,
            symbol: position.symbol,
            type: position.type,
            volume: position.volume,
            openPrice: position.openPrice,
            currentPrice: position.currentPrice,
            profit: position.profit,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit
          });
        }
      },
      
      onPositionRemoved: (accountId, positionId) => {
        self.knownPositions.delete(positionId);
        console.log(`❌ Position closed: ${positionId}`);
        callback('position_closed', { id: positionId });
      },
      
      onDealAdded: (accountId, deal) => {
        // Deal represents actual execution (partial or full close)
        console.log(`💰 Deal executed: ${deal.symbol} ${deal.type} volume: ${deal.volume} profit: ${deal.profit}`);
        if (deal.entryType === 'DEAL_ENTRY_OUT') {
          // Send deal_closed event with accurate profit
          callback('deal_closed', {
            positionId: deal.positionId,
            symbol: deal.symbol,
            type: deal.type,
            volume: deal.volume,
            profit: deal.profit,
            price: deal.price,
            time: deal.time
          });
        }
      },

      onOrderUpdated: (accountId, order) => {
        console.log(`📋 Order updated: ${order.symbol}`);
        callback('order_updated', {
          id: order.id,
          symbol: order.symbol,
          type: order.type,
          volume: order.volume,
          openPrice: order.openPrice,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit
        });
      },
      
      onOrderCompleted: (accountId, orderId) => {
        console.log(`✅ Order completed: ${orderId}`);
        callback('order_completed', { id: orderId });
      }
    });
  }

  // Disconnect
  async disconnect() {
    if (this.connection) {
      await this.connection.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from MetaTrader');
    }
  }
}

module.exports = new MetaTraderService();
