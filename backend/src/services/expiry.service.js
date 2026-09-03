import InventoryItem from '../models/InventoryItem.js';
import Merchant from '../models/Merchant.js';
import { sendTextMessage, sendInteractiveButtons } from './whatsapp.service.js';

export async function checkAndSendExpiryNotifications(merchantId = null) {
  try {
    const targetExpiry = new Date();
    targetExpiry.setDate(targetExpiry.getDate() + 45); // 45 days warning
    const expiryThreshold = `${targetExpiry.getFullYear()}-${String(targetExpiry.getMonth() + 1).padStart(2, '0')}`;

    let matchQuery = { expiryDates: { $lte: expiryThreshold } };
    if (merchantId) {
      matchQuery.merchantId = merchantId;
    }

    const expiringItems = await InventoryItem.find(matchQuery).populate('merchantId').lean();

    if (!expiringItems.length) return { success: true, message: "No expiring items found." };

    // Group items by merchant
    const merchantMap = {};
    for (const item of expiringItems) {
      if (!item.merchantId) continue;
      const mId = item.merchantId._id.toString();
      if (!merchantMap[mId]) {
        merchantMap[mId] = {
          merchant: item.merchantId,
          items: []
        };
      }
      merchantMap[mId].items.push(item);
    }

    // Send WhatsApp messages
    let sentCount = 0;
    for (const mId of Object.keys(merchantMap)) {
      const { merchant, items } = merchantMap[mId];
      if (!merchant.whatsappNumber) continue;

      // Send a separate message with a clear button for each expiring item
      for (const item of items) {
        const nearingExpiry = item.expiryDates.filter(d => d <= expiryThreshold).sort();
        if (nearingExpiry.length > 0) {
          const dateToClear = nearingExpiry[0];
          const text = `⚠️ *Expiry Alert*\n\nYour stock for *${item.name}* (Expires: ${dateToClear}) is nearing its expiry date.\n\nPlease check your physical stock. Once handled, click below to clear this alert.`;
          
          await sendInteractiveButtons(merchant.whatsappNumber, text, [
            { id: `clearexpiry_${item._id}_${dateToClear}`, title: 'Clear Alert' }
          ]);
        }
      }
      
      sentCount++;
    }

    return { success: true, message: `Sent ${sentCount} notifications.` };
  } catch (err) {
    console.error('Failed to send expiry notifications:', err);
    return { success: false, error: err.message };
  }
}
