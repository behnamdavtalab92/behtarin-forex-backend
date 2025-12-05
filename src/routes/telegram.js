const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegram');

// Get channel info
router.get('/channel', async (req, res) => {
  try {
    const info = await telegramService.getChannelInfo();
    res.json(info || { error: 'Could not fetch channel info' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get channel messages
router.get('/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const messages = await telegramService.getChannelMessages(limit);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to channel (Admin)
router.post('/send', async (req, res) => {
  try {
    const { text, password } = req.body;
    
    // Simple password protection
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'behtarin123';
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'رمز عبور اشتباه است' });
    }
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'متن پیام نمیتواند خالی باشد' });
    }
    
    const result = await telegramService.sendMessage(text);
    
    if (result && result.ok) {
      res.json({ success: true, message: 'پیام با موفقیت ارسال شد' });
    } else {
      res.status(500).json({ error: result?.description || 'خطا در ارسال پیام' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send signal to channel (Admin)
router.post('/send-signal', async (req, res) => {
  try {
    const { symbol, tradeType, entries, stopLoss, targets, password } = req.body;
    
    // Simple password protection
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'behtarin123';
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'رمز عبور اشتباه است' });
    }
    
    // Build signal message
    const symbolNames = {
      'XAUUSD': 'طلا',
      'EURUSD': 'یورو/دلار',
      'GBPUSD': 'پوند/دلار',
      'XAGUSD': 'نقره',
    };
    
    let message = `▪️ نماد معاملاتی: ${symbol} (${symbolNames[symbol] || symbol})\n`;
    message += `▪️ نوع معامله: ${tradeType === 'buy' ? '🟢 خرید' : '🔴 فروش'}\n`;
    message += `▪️ نقاط ورود: ${entries}\n`;
    message += `▪️ استاپ لاس: ${stopLoss}\n`;
    
    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);
    targetList.forEach((target, idx) => {
      message += `▪️ تارگت ${idx + 1}: ${target}\n`;
    });
    
    message += `\n🆔 t.me/behtarinforex`;
    
    const result = await telegramService.sendMessage(message);
    
    if (result && result.ok) {
      res.json({ success: true, message: 'سیگنال با موفقیت ارسال شد' });
    } else {
      res.status(500).json({ error: result?.description || 'خطا در ارسال سیگنال' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
