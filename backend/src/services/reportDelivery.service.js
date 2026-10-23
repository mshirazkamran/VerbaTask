import {
  generateInventoryReport,
  generateLowStockReport,
  generateExpiringReport,
  generateSalesReport,
  generateTopSellingReport,
  generateKhataReport,
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
 * Builds a PDF with `generate(merchant)` and delivers it to the merchant on WhatsApp.
 * Failures are reported to the merchant, never thrown.
 */
async function sendGeneratedReport(merchant, generate, language, { announce = true, caption } = {}) {
  const en = language === 'en';
  const recipient = merchant?._replyToNumber || merchant?.whatsappNumber;
  const send = async (text) => {
    try {
      await sendTextMessage(recipient, text);
    } catch (err) {
      console.error('deliverReport text send failed:', err.message);
    }
  };

  if (announce) {
    await send(en ? 'Generating your PDF report, please wait...' : 'آپ کی رپورٹ تیار ہو رہی ہے، براہ کرم انتظار کریں...');
  }

  try {
    const report = await generate(merchant);
    const { id: mediaId } = await uploadMedia(report.buffer, 'application/pdf', report.filename);
    await sendDocumentMessage(
      recipient,
      mediaId,
      report.filename,
      caption || (en ? 'Here is your requested report! 📄' : 'یہ رہی آپ کی رپورٹ! 📄')
    );
    return { success: true, filename: report.filename };
  } catch (err) {
    const errorDetails = err.response?.data?.error?.message || err.message;
    console.error('Report generation failed:', errorDetails);
    await send(en ? 'Sorry, something went wrong while generating your report.' : 'معذرت، رپورٹ تیار کرنے میں کچھ مسئلہ پیش آیا۔');
    return { success: false, error: errorDetails };
  }
}

/**
 * Generates a PDF report and delivers it to the merchant on WhatsApp. Shared by
 * the "report" command and automations so both send identical documents.
 */
export async function deliverReport(merchant, reportType, language = 'ur', options = {}) {
  const generate = GENERATORS[reportType] || generateInventoryReport;
  return sendGeneratedReport(merchant, generate, language, options);
}

/** Sends one customer's khata statement (purchases with dates and items, payments, balance). */
export async function deliverKhataReport(merchant, customer, language = 'ur', options = {}) {
  const en = language === 'en';
  const name = String(customer.name || '').toUpperCase();
  return sendGeneratedReport(merchant, (m) => generateKhataReport(m, customer), language, {
    caption: en ? `Khata statement — ${name} 📒` : `کھاتہ رپورٹ — ${name} 📒`,
    ...options,
  });
}
