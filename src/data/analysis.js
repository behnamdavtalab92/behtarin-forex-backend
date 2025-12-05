// Mock analysis database
const analysis = [
  {
    id: '1',
    title: 'تحلیل هفتگی یورو/دلار',
    pair: 'EUR/USD',
    type: 'technical',
    content: `
      ## تحلیل تکنیکال EUR/USD
      
      جفت ارز یورو/دلار در هفته گذشته با رشد 0.8% به سطح 1.0900 رسید.
      
      ### نقاط کلیدی:
      - مقاومت: 1.0950 - 1.1000
      - حمایت: 1.0800 - 1.0750
      
      ### اندیکاتورها:
      - RSI: 62 (صعودی)
      - MACD: سیگنال خرید
      - Moving Average: قیمت بالای MA50
    `,
    imageUrl: 'https://via.placeholder.com/800x500/1a1a2e/16db93?text=EUR/USD+Analysis',
    author: 'تیم تحلیل',
    views: 1250,
    likes: 89,
    createdAt: '2024-01-15T07:00:00Z'
  },
  {
    id: '2',
    title: 'بررسی طلا در بحران‌های ژئوپلیتیک',
    pair: 'XAU/USD',
    type: 'fundamental',
    content: `
      ## تحلیل فاندامنتال طلا
      
      با افزایش تنش‌های ژئوپلیتیک، طلا همچنان به عنوان دارایی امن مورد توجه است.
      
      ### عوامل تأثیرگذار:
      - نرخ بهره فدرال رزرو
      - تورم جهانی
      - تنش‌های خاورمیانه
      
      ### پیش‌بینی:
      هدف کوتاه‌مدت: $2100
      هدف میان‌مدت: $2200
    `,
    imageUrl: 'https://via.placeholder.com/800x500/1a1a2e/f9d923?text=GOLD+Analysis',
    author: 'تیم تحلیل',
    views: 2340,
    likes: 156,
    createdAt: '2024-01-14T12:00:00Z'
  },
  {
    id: '3',
    title: 'آینده بیت‌کوین در 2024',
    pair: 'BTC/USD',
    type: 'technical',
    content: `
      ## تحلیل بیت‌کوین
      
      با نزدیک شدن به هاوینگ، بیت‌کوین پتانسیل رشد قابل توجهی دارد.
      
      ### سطوح مهم:
      - مقاومت: $48,000 - $52,000
      - حمایت: $38,000 - $35,000
      
      ### سناریوها:
      - صعودی: شکست $48K، هدف $65K
      - نزولی: شکست $38K، هدف $30K
    `,
    imageUrl: 'https://via.placeholder.com/800x500/1a1a2e/9b59b6?text=BTC+Analysis',
    author: 'تیم تحلیل',
    views: 4520,
    likes: 312,
    createdAt: '2024-01-13T15:30:00Z'
  }
];

module.exports = analysis;

