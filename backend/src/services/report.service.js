import PDFDocument from 'pdfkit-table';
import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';

function createPdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function buildHeader(doc, merchant, title) {
  doc.fontSize(20).text(merchant.businessName || 'Business Report', { align: 'center' });
  doc.fontSize(14).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();
}

export async function generateInventoryReport(merchant) {
  const items = await InventoryItem.find({ merchantId: merchant._id }).sort({ name: 1 });
  
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  buildHeader(doc, merchant, 'Full Inventory Stock Report');
  
  const table = {
    title: 'Inventory Items',
    headers: ['Item Name', 'Stock Qty', 'Unit Price (PKR)', 'Total Value (PKR)'],
    rows: items.map(item => [
      item.name,
      `${item.quantity} ${item.unit || ''}`.trim(),
      item.price ? item.price.toString() : '-',
      item.price && item.quantity ? (item.price * item.quantity).toString() : '-'
    ])
  };
  
  await doc.table(table, { width: 500 });
  doc.end();
  
  return { buffer: await createPdfBuffer(doc), filename: 'Inventory_Report.pdf' };
}

export async function generateLowStockReport(merchant) {
  const items = await InventoryItem.find({ merchantId: merchant._id, quantity: { $lt: 10 } }).sort({ quantity: 1 });
  
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  buildHeader(doc, merchant, 'Low Stock Alert Report (<10 items)');
  
  const table = {
    title: 'Low Stock Items',
    headers: ['Item Name', 'Current Stock'],
    rows: items.map(item => [item.name, `${item.quantity} ${item.unit || ''}`.trim()])
  };
  
  if (items.length === 0) {
    doc.text('All stock is healthy. No low stock items found.');
  } else {
    await doc.table(table, { width: 500 });
  }
  
  doc.end();
  return { buffer: await createPdfBuffer(doc), filename: 'Low_Stock_Report.pdf' };
}

export async function generateExpiringReport(merchant) {
  const targetExpiry = new Date();
  targetExpiry.setDate(targetExpiry.getDate() + 45); // 45 days warning
  const expiryThreshold = `${targetExpiry.getFullYear()}-${String(targetExpiry.getMonth() + 1).padStart(2, '0')}`;
  
  const items = await InventoryItem.find({ merchantId: merchant._id, expiryDates: { $lte: expiryThreshold } });
  
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  buildHeader(doc, merchant, 'Expiring Stock Report');
  
  const rows = [];
  for (const item of items) {
    const nearingExpiry = item.expiryDates.filter(d => d <= expiryThreshold).sort();
    if (nearingExpiry.length > 0) {
      rows.push([item.name, nearingExpiry.join(', ')]);
    }
  }

  const table = {
    title: 'Items Expiring within 45 days',
    headers: ['Item Name', 'Expiry Dates'],
    rows
  };
  
  if (rows.length === 0) {
    doc.text('No items are expiring soon.');
  } else {
    await doc.table(table, { width: 500 });
  }
  
  doc.end();
  return { buffer: await createPdfBuffer(doc), filename: 'Expiring_Report.pdf' };
}

export async function generateSalesReport(merchant) {
  // Just a simple report of the last 100 orders or today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = await Order.find({ merchantId: merchant._id, createdAt: { $gte: today } }).sort({ createdAt: -1 });
  
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  buildHeader(doc, merchant, 'Daily Sales Report (Today)');
  
  let totalRevenue = 0;
  const rows = orders.map(o => {
    const amt = o.total || 0;
    totalRevenue += amt;
    return [
      new Date(o.createdAt).toLocaleTimeString(),
      o.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      o.paymentMethod || 'cash',
      amt.toString()
    ];
  });
  
  const table = {
    title: `Total Sales Today: ${totalRevenue} PKR`,
    headers: ['Time', 'Items', 'Payment', 'Amount (PKR)'],
    rows
  };
  
  if (rows.length === 0) {
    doc.text('No sales recorded today.');
  } else {
    await doc.table(table, { width: 500 });
  }
  
  doc.end();
  return { buffer: await createPdfBuffer(doc), filename: 'Daily_Sales_Report.pdf' };
}

export async function generateTopSellingReport(merchant) {
  // Aggregate top selling items
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  buildHeader(doc, merchant, 'Top Selling Items Report');
  
  const pipeline = [
    { $match: { merchantId: merchant._id } },
    { $unwind: "$items" },
    { $group: { _id: "$items.name", totalSold: { $sum: "$items.quantity" }, revenue: { $sum: "$items.price" } } },
    { $sort: { totalSold: -1 } },
    { $limit: 20 }
  ];
  
  const topItems = await Order.aggregate(pipeline);
  
  const table = {
    title: 'Top 20 Items by Sales Volume',
    headers: ['Item Name', 'Total Qty Sold'],
    rows: topItems.map(t => [t._id, t.totalSold.toString()])
  };
  
  if (topItems.length === 0) {
    doc.text('No sales data available to calculate top sellers.');
  } else {
    await doc.table(table, { width: 500 });
  }
  
  doc.end();
  return { buffer: await createPdfBuffer(doc), filename: 'Top_Selling_Report.pdf' };
}
