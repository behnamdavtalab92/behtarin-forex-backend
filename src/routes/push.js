const express = require('express');
const router = express.Router();
const pushService = require('../services/pushNotification');

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: pushService.getPublicKey() });
});

// Subscribe to push notifications
router.post('/subscribe', (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({ error: 'Missing subscription or userId' });
    }

    pushService.addSubscription(userId, subscription);
    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    pushService.removeSubscription(userId);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send test notification (admin only)
router.post('/test', async (req, res) => {
  try {
    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'behtarin123';
    
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await pushService.sendToAll(
      '🔔 Test Notification',
      'اگر این پیام را می‌بینید، نوتیفیکیشن کار می‌کند!',
      { type: 'test' }
    );

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscription count
router.get('/stats', (req, res) => {
  res.json({ subscriptions: pushService.getSubscriptionCount() });
});

module.exports = router;

