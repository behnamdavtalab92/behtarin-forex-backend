const webpush = require('web-push');

// VAPID Keys (set via environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

// Configure web-push
webpush.setVapidDetails(
  'mailto:behtarinforex@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Store subscriptions (in production, use database)
const subscriptions = new Map();

class PushNotificationService {
  // Add subscription
  addSubscription(userId, subscription) {
    subscriptions.set(userId, subscription);
    console.log(`📱 Push subscription added for user: ${userId}`);
    console.log(`📱 Total subscriptions: ${subscriptions.size}`);
  }

  // Remove subscription
  removeSubscription(userId) {
    subscriptions.delete(userId);
    console.log(`📱 Push subscription removed for user: ${userId}`);
  }

  // Send notification to specific user
  async sendToUser(userId, title, body, data = {}) {
    const subscription = subscriptions.get(userId);
    if (!subscription) {
      console.log(`⚠️ No subscription for user: ${userId}`);
      return false;
    }

    return this.sendNotification(subscription, title, body, data);
  }

  // Send notification to all subscribers
  async sendToAll(title, body, data = {}) {
    console.log(`📢 Sending notification to ${subscriptions.size} subscribers`);
    
    const results = [];
    for (const [userId, subscription] of subscriptions) {
      try {
        await this.sendNotification(subscription, title, body, data);
        results.push({ userId, success: true });
      } catch (error) {
        console.error(`❌ Failed to send to ${userId}:`, error.message);
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          this.removeSubscription(userId);
        }
        results.push({ userId, success: false, error: error.message });
      }
    }
    return results;
  }

  // Send notification
  async sendNotification(subscription, title, body, data = {}) {
    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      data,
      timestamp: Date.now()
    });

    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`✅ Notification sent: ${title}`);
      return true;
    } catch (error) {
      console.error(`❌ Push notification error:`, error.message);
      throw error;
    }
  }

  // Get public key for frontend
  getPublicKey() {
    return VAPID_PUBLIC_KEY;
  }

  // Get subscription count
  getSubscriptionCount() {
    return subscriptions.size;
  }
}

module.exports = new PushNotificationService();

