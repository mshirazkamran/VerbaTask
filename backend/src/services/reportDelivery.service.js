import {
  generateInventoryReport,
  generateLowStockReport,
  generateExpiringReport,
  generateSalesReport,
  generateTopSellingReport,
} from './report.service.js';
import { uploadMedia } from './media.service.js';
import { sendTextMessage, sendDocumentMessage } from './whatsapp.service.js';

const GENERATORS = {
  low_stock: generateLowStockReport,
  top_selling: generateTopSellingReport,
  expiring: generateExpiringReport,
  sales: generateSalesReport,
  inventory: generateInventoryReport,
};

/**
 * Generates a PDF report and delivers it to the merchant on WhatsApp. Shared by
 * the "report" command and automations so both send identical documents.
 * Returns true on success; failures are reported to the merchant, never thrown.
 */
export async function deliverReport(merchant, reportType, language = 'ur', { announce = true, caption } = {}) {
  const en = language === 'en';
  const send = async (text) => {
    try {
      await sendTextMessage(merchant.whatsappNumber, text);
    } catch (err) {
      console.error('deliverReport text send failed:', err.message);
    }
  };

  if (announce) {
    await send(en ? 'Generating your PDF report, please wait...' : 'آپ کی رپورٹ تیار ہو رہی ہے، براہ کرم انتظار کریں...');
  }

  try {
    const generate = GENERATORS[reportType] || generateInventoryReport;
    const report = await generate(merchant);
    const { id: mediaId } = await uploadMedia(report.buffer, 'application/pdf', report.filename);
    await sendDocumentMessage(
      merchant.whatsappNumber,
      mediaId,
      report.filename,
      caption || (en ? 'Here is your requested report! 📄' : 'یہ رہی آپ کی رپورٹ! 📄')
    );
    return true;
  } catch (err) {
    console.error('Report generation failed:', err);
    await send(en ? 'Sorry, something went wrong while generating your report.' : 'معذرت، رپورٹ تیار کرنے میں کچھ مسئلہ پیش آیا۔');
    return false;
  }
}
