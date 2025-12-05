const express = require('express');
const router = express.Router();
const metaTrader = require('../services/metaTrader');

// Get account info
router.get('/account', async (req, res) => {
  try {
    const info = await metaTrader.getAccountInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get open positions (active trades)
router.get('/positions', async (req, res) => {
  try {
    const positions = await metaTrader.getOpenPositions();
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await metaTrader.getPendingOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trade history
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const history = await metaTrader.getTradeHistory(days);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all trades (positions + orders)
router.get('/all', async (req, res) => {
  try {
    const [positions, orders, account] = await Promise.all([
      metaTrader.getOpenPositions(),
      metaTrader.getPendingOrders(),
      metaTrader.getAccountInfo()
    ]);
    
    res.json({
      account,
      positions,
      orders,
      connected: metaTrader.isConnected
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

