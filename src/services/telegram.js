const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL || 'behtarinforex';

class TelegramService {
  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  }

  async getChannelInfo() {
    try {
      // Get channel info
      const response = await fetch(`${this.baseUrl}/getChat?chat_id=@${CHANNEL_USERNAME}`);
      const data = await response.json();
      
      // Get member count separately (more reliable)
      let memberCount = 0;
      try {
        const countResponse = await fetch(`${this.baseUrl}/getChatMemberCount?chat_id=@${CHANNEL_USERNAME}`);
        const countData = await countResponse.json();
        if (countData.ok) {
          memberCount = countData.result;
          console.log(`👥 Channel members: ${memberCount}`);
        }
      } catch (e) {
        console.log('Could not get member count');
      }
      
      if (data.ok) {
        return {
          title: data.result.title,
          username: data.result.username,
          description: data.result.description,
          memberCount: memberCount || data.result.member_count || 0,
        };
      }
      return { title: CHANNEL_USERNAME, username: CHANNEL_USERNAME, memberCount: 0 };
    } catch (error) {
      return { title: CHANNEL_USERNAME, username: CHANNEL_USERNAME, memberCount: 0 };
    }
  }

  cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
      .replace(/\n\n\n+/g, '\n\n')
      .trim();
  }

  async scrapeChannelMessages(limit = 30) {
    try {
      const url = `https://t.me/s/${CHANNEL_USERNAME}`;
      console.log(`📡 Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.log('❌ Failed to fetch:', response.status);
        return [];
      }

      const html = await response.text();
      
      const messages = [];
      
      // Split by message widget
      const messageParts = html.split('class="tgme_widget_message_wrap');
      console.log(`📨 Found ${messageParts.length - 1} messages`);
      
      for (let i = 1; i < messageParts.length; i++) {
        try {
          const msgHtml = messageParts[i];
          
          // Extract message ID from data-post
          let messageId = `msg-${i}`;
          const postMatch = msgHtml.match(/data-post="([^"]+)"/);
          if (postMatch) {
            const parts = postMatch[1].split('/');
            if (parts.length > 1) {
              messageId = parts[1];
            }
          }
          
          // Check for reply
          let replyTo = null;
          const hasReply = msgHtml.includes('tgme_widget_message_reply');
          
          if (hasReply) {
            // Extract reply message ID from href
            const replyHrefMatch = msgHtml.match(/message_reply[^>]*href="[^"]*\/(\d+)/);
            const replyId = replyHrefMatch ? replyHrefMatch[1] : null;
            
            // Extract reply section
            const replySection = msgHtml.split('tgme_widget_message_reply')[1];
            if (replySection) {
              const endReply = replySection.indexOf('</a>');
              if (endReply > 0) {
                const replyContent = replySection.substring(0, endReply);
                
                // Look for reply_text div and get ALL its content (including nested)
                const replyTextStart = replyContent.indexOf('reply_text');
                if (replyTextStart > -1) {
                  const afterReplyText = replyContent.substring(replyTextStart);
                  const contentStart = afterReplyText.indexOf('>');
                  if (contentStart > -1) {
                    // Get everything until closing div
                    let content = afterReplyText.substring(contentStart + 1);
                    const divEnd = content.indexOf('</div>');
                    if (divEnd > -1) {
                      content = content.substring(0, divEnd);
                    }
                    
                    // Clean the HTML and get text
                    let replyText = this.cleanHtml(content);
                    
                    // Filter out channel name
                    if (replyText && replyText.length > 5 && !replyText.includes('|') && !replyText.includes('بهترین فارکس')) {
                      replyTo = { 
                        id: replyId,
                        text: replyText.length > 80 ? replyText.substring(0, 80) + '...' : replyText 
                      };
                      console.log(`✅ Reply to msg ${replyId}: "${replyTo.text.substring(0, 60)}..."`);
                    }
                  }
                }
              }
            }
          }
          
          // Get main message text
          let textContent = '';
          const textMatch = msgHtml.match(/js-message_text[^>]*>([\s\S]*?)<\/div>/);
          if (textMatch) {
            textContent = this.cleanHtml(textMatch[1]);
          }
          
          if (textContent.length === 0) continue;
          
          // Get views
          let views = '';
          const viewsMatch = msgHtml.match(/message_views[^>]*>([^<]+)/);
          if (viewsMatch) views = viewsMatch[1].trim();
          
          // Get time
          let time = '';
          const timeMatch = msgHtml.match(/datetime="([^"]+)"/);
          if (timeMatch) {
            const date = new Date(timeMatch[1]);
            time = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
          }
          
          messages.push({
            id: messageId,
            text: textContent,
            time: time,
            views: views,
            replyTo: replyTo
          });
        } catch (err) {
          console.error('Parse error:', err.message);
        }
      }
      
      const repliesCount = messages.filter(m => m.replyTo).length;
      console.log(`\n✅ Total: ${messages.length} messages, ${repliesCount} with replies`);
      
      return messages.slice(-limit);
      
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  async getChannelMessages(limit = 30) {
    return await this.scrapeChannelMessages(limit);
  }

  async sendMessage(text) {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: `@${CHANNEL_USERNAME}`,
          text: text,
          parse_mode: 'HTML'
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error sending:', error);
      return { ok: false, description: error.message };
    }
  }
}

module.exports = new TelegramService();
