import PDFDocument from 'pdfkit-table';
import InventoryItem from '../models/InventoryItem.js';
import Order from '../models/Order.js';

function createPdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function formatBusinessName(name, location) {
  if (!name || typeof name !== 'string') return '';
  let clean = name.trim();
  if (clean.includes(',')) clean = clean.split(',')[0].trim();
  if (clean.includes(' - ')) clean = clean.split(' - ')[0].trim();
  else if (clean.includes(' | ')) clean = clean.split(' | ')[0].trim();
  clean = clean.replace(/[.,:;\-\s]+$/, '');
  if (location && typeof location === 'string' && location.trim()) {
    const loc = location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locRegex = new RegExp(`\\s*[-–,|]?\\s*${loc}\\b.*$`, 'i');
    clean = clean.replace(locRegex, '').trim();
  }
  return clean.replace(/[.,:;\-\s]+$/, '') || name.trim();
}

/**
 * Builds modern, stylish, branded header and metadata block:
 * 1. "VerbaTask" on top: Big Bold
 * 2. Below that: Report Name
 * 3. Below that: Date & Time
 * Store Name and ERP system tags on the top right.
 */
function drawHeader(doc, merchant, title, themeColor = '#2563EB') {
  const storeName = formatBusinessName(merchant.businessName, merchant.location) || merchant.businessName || 'My Business Store';
  const now = new Date();

  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Top accent brand bar
  doc.rect(35, 25, 525, 4).fill(themeColor);

  // 1. "VerbaTask" ON TOP BIG BOLD
  doc.font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#0F172A')
    .text('VerbaTask', 35, 38, { width: 300 });

  // Right side: Store Name
  doc.font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#334155')
    .text(storeName, 335, 40, { width: 225, align: 'right', ellipsis: true });

  // 2. Below that: Report Name
  doc.font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(themeColor)
    .text(title.toUpperCase(), 35, 68, { width: 350 });

  // 3. Below that: Date & Time
  doc.font('Helvetica')
    .fontSize(9.5)
    .fillColor('#64748B')
    .text(`Date: ${dateStr}   •   Time: ${timeStr}`, 35, 86, { width: 350 });

  // Right side: Tagline
  doc.font('Helvetica')
    .fontSize(8.5)
    .fillColor('#94A3B8')
    .text('Retail Ledger & Inventory Intelligence', 335, 87, { width: 225, align: 'right' });

  // Header separator line
  doc.moveTo(35, 102)
    .lineTo(560, 102)
    .lineWidth(0.75)
    .strokeColor('#E2E8F0')
    .stroke();

  doc.y = 112;
}

/**
 * Draws sleek modern KPI Summary pills
 */
function drawKpiCards(doc, cards, startY = 112) {
  const cardWidth = 165;
  const cardHeight = 50;
  const gap = 15;

  cards.forEach((card, index) => {
    const cardX = 35 + index * (cardWidth + gap);
    doc.roundedRect(cardX, startY, cardWidth, cardHeight, 5)
      .fillAndStroke(card.bgColor, card.borderColor);

    doc.font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(card.labelColor)
      .text(card.label.toUpperCase(), cardX + 10, startY + 8);

    const fontSize = card.value && card.value.length > 20 ? 10.5 : 13;
    doc.font('Helvetica-Bold')
      .fontSize(fontSize)
      .fillColor(card.valueColor)
      .text(card.value, cardX + 10, startY + 23, { width: cardWidth - 20, height: 22, ellipsis: true });
  });

  doc.y = startY + cardHeight + 16;
}

/**
 * Draws empty state callout box
 */
function drawEmptyState(doc, title, subtitle) {
  const boxY = doc.y;
  doc.roundedRect(35, boxY, 525, 45, 6)
    .fillAndStroke('#F8FAFC', '#E2E8F0');

  doc.font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#475569')
    .text(title, 50, boxY + 11, { width: 495, align: 'center' });

  doc.font('Helvetica')
    .fontSize(8.5)
    .fillColor('#94A3B8')
    .text(subtitle, 50, boxY + 26, { width: 495, align: 'center' });

  doc.y = boxY + 55;
}

/**
 * Renders consistent bottom footer across ALL generated pages.
 */
function applyFootersToAllPages(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const origBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const dividerY = doc.page.height - 38;
    const footerY = doc.page.height - 28;

    doc.moveTo(35, dividerY)
      .lineTo(560, dividerY)
      .lineWidth(0.5)
      .strokeColor('#CBD5E1')
      .stroke();

    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#0F172A')
      .text('VerbaTask', 35, footerY, { lineBreak: false });

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#64748B')
      .text('  •  Smart Retail & WhatsApp ERP  •  verbatask.com', 85, footerY, { lineBreak: false });

    const rightText = range.count > 1
      ? `Page ${i + 1} of ${range.count}`
      : 'Confidential Store Report';

    doc.font('Helvetica')
      .fontSize(8)
      .fillColor('#94A3B8')
      .text(rightText, 380, footerY, { width: 180, align: 'right', lineBreak: false });

    doc.page.margins.bottom = origBottomMargin;
  }
}

export async function generateTopSellingReport(merchant) {
  const doc = new PDFDocument({ margins: { top: 35, bottom: 45, left: 35, right: 35 }, size: 'A4', bufferPages: true });
  drawHeader(doc, merchant, 'Top Selling Items Report', '#4F46E5');

  const pipeline = [
    { $match: { merchantId: merchant._id } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.price' },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 25 },
  ];

  let topItems = await Order.aggregate(pipeline);
  if (!Array.isArray(topItems)) topItems = [];

  const totalSoldAll = topItems.reduce((acc, t) => acc + (t.totalSold || 0), 0);
  const totalRevenueAll = topItems.reduce((acc, t) => acc + (t.revenue || 0), 0);
  const bestSeller = topItems.length > 0 ? `${topItems[0]._id} (${topItems[0].totalSold} sold)` : 'None';

  drawKpiCards(doc, [
    {
      label: 'Ranked Products',
      value: `${topItems.length} Items`,
      bgColor: '#EEF2FF',
      borderColor: '#C7D2FE',
      labelColor: '#4338CA',
      valueColor: '#1E1B4B',
    },
    {
      label: 'Total Volume Sold',
      value: `${totalSoldAll} Units`,
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      labelColor: '#15803D',
      valueColor: '#14532D',
    },
    {
      label: '#1 Top Bestseller',
      value: bestSeller,
      bgColor: '#FAF5FF',
      borderColor: '#E9D5FF',
      labelColor: '#7E22CE',
      valueColor: '#581C87',
    },
  ]);

  if (topItems.length === 0) {
    drawEmptyState(doc, 'No sales transactions recorded yet to calculate top sellers.', 'Transactions processed via WhatsApp or Web will rank automatically.');
  } else {
    const rows = topItems.map((t, idx) => ({
      idx: (idx + 1).toString(),
      name: t._id || 'Unknown Item',
      qty: `${t.totalSold} Units`,
      revenue: `Rs. ${(t.revenue || 0).toLocaleString()}`,
      options: {
        backgroundColor: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
        backgroundOpacity: 1,
      },
    }));

    // Add totals row
    rows.push({
      idx: '',
      name: 'TOTAL SALES VOLUME & REVENUE',
      qty: `${totalSoldAll} Units`,
      revenue: `Rs. ${totalRevenueAll.toLocaleString()}`,
      isTotal: true,
      options: {
        backgroundColor: '#EEF2FF',
        backgroundOpacity: 1,
      },
    });

    const table = {
      headers: [
        { label: '#', property: 'idx', width: 40, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Item Description', property: 'name', width: 255, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'left', align: 'left' },
        { label: 'Total Qty Sold', property: 'qty', width: 110, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
        { label: 'Revenue Generated', property: 'revenue', width: 120, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
      ],
      datas: rows,
    };

    await doc.table(table, {
      x: 35,
      width: 525,
      padding: 7,
      divider: {
        header: { disabled: false, width: 1.5, opacity: 1, color: '#0F172A' },
        horizontal: { disabled: false, width: 0.5, opacity: 1, color: '#E2E8F0' },
        vertical: { disabled: false, width: 0.5, opacity: 0.5, color: '#E2E8F0' },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF'),
      prepareRow: (row) => {
        if (row.isTotal) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E1B4B');
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');
        }
      },
    });
  }

  applyFootersToAllPages(doc);
  doc.end();

  return { buffer: await createPdfBuffer(doc), filename: 'Top_Selling_Report.pdf' };
}

export async function generateInventoryReport(merchant) {
  let items = await InventoryItem.find({ merchantId: merchant._id }).sort({ name: 1 });
  if (items && typeof items.limit === 'function') items = await items.limit();
  if (!Array.isArray(items)) items = [];

  const doc = new PDFDocument({ margins: { top: 35, bottom: 45, left: 35, right: 35 }, size: 'A4', bufferPages: true });
  drawHeader(doc, merchant, 'Full Inventory Stock Report', '#2563EB');

  const totalStockQty = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
  const totalValuation = items.reduce((acc, i) => acc + (i.price && i.quantity ? i.price * i.quantity : 0), 0);

  drawKpiCards(doc, [
    {
      label: 'Catalog Items',
      value: `${items.length} Products`,
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      labelColor: '#1D4ED8',
      valueColor: '#1E3A8A',
    },
    {
      label: 'Total Stock Units',
      value: `${totalStockQty} Units`,
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      labelColor: '#15803D',
      valueColor: '#14532D',
    },
    {
      label: 'Inventory Valuation',
      value: `PKR ${totalValuation.toLocaleString()}`,
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      labelColor: '#B45309',
      valueColor: '#78350F',
    },
  ]);

  if (items.length === 0) {
    drawEmptyState(doc, 'No inventory items logged in your catalog yet.', 'Add items via WhatsApp ("5 kg chawal 300") or through the web dashboard.');
  } else {
    const rows = items.map((item, idx) => ({
      idx: (idx + 1).toString(),
      name: item.name,
      stock: `${item.quantity} ${item.unit || ''}`.trim(),
      price: item.price ? `Rs. ${item.price.toLocaleString()}` : '-',
      value: item.price && item.quantity ? `Rs. ${(item.price * item.quantity).toLocaleString()}` : '-',
      options: {
        backgroundColor: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
        backgroundOpacity: 1,
      },
    }));

    // Add totals row
    rows.push({
      idx: '',
      name: 'TOTAL INVENTORY VALUATION',
      stock: `${totalStockQty} Units`,
      price: '',
      value: `Rs. ${totalValuation.toLocaleString()}`,
      isTotal: true,
      options: {
        backgroundColor: '#EEF2FF',
        backgroundOpacity: 1,
      },
    });

    const table = {
      headers: [
        { label: '#', property: 'idx', width: 35, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Item Description', property: 'name', width: 220, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'left', align: 'left' },
        { label: 'Current Stock', property: 'stock', width: 85, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
        { label: 'Unit Price', property: 'price', width: 90, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
        { label: 'Total Value', property: 'value', width: 95, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
      ],
      datas: rows,
    };

    await doc.table(table, {
      x: 35,
      width: 525,
      padding: 7,
      divider: {
        header: { disabled: false, width: 1.5, opacity: 1, color: '#0F172A' },
        horizontal: { disabled: false, width: 0.5, opacity: 1, color: '#E2E8F0' },
        vertical: { disabled: false, width: 0.5, opacity: 0.5, color: '#E2E8F0' },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF'),
      prepareRow: (row) => {
        if (row.isTotal) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E1B4B');
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');
        }
      },
    });
  }

  applyFootersToAllPages(doc);
  doc.end();

  return { buffer: await createPdfBuffer(doc), filename: 'Inventory_Report.pdf' };
}

export async function generateLowStockReport(merchant) {
  let items = await InventoryItem.find({ merchantId: merchant._id, quantity: { $lt: 10 } }).sort({ quantity: 1 });
  if (items && typeof items.limit === 'function') items = await items.limit();
  if (!Array.isArray(items)) items = [];

  const doc = new PDFDocument({ margins: { top: 35, bottom: 45, left: 35, right: 35 }, size: 'A4', bufferPages: true });
  drawHeader(doc, merchant, 'Low Stock Alert Report (<10 items)', '#EA580C');

  const criticalCount = items.filter((i) => i.quantity < 5).length;

  drawKpiCards(doc, [
    {
      label: 'Low Stock Alerts',
      value: `${items.length} Items`,
      bgColor: '#FFF7ED',
      borderColor: '#FFEDD5',
      labelColor: '#C2410C',
      valueColor: '#7C2D12',
    },
    {
      label: 'Critical (< 5 left)',
      value: `${criticalCount} Items`,
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      labelColor: '#DC2626',
      valueColor: '#7F1D1D',
    },
    {
      label: 'Action Required',
      value: items.length > 0 ? 'Reorder Urgent' : 'Healthy',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      labelColor: '#15803D',
      valueColor: '#14532D',
    },
  ]);

  if (items.length === 0) {
    drawEmptyState(doc, 'All stock is healthy! No items are currently below threshold.', 'Stock levels are tracked automatically when sales are confirmed.');
  } else {
    const rows = items.map((item, idx) => ({
      idx: (idx + 1).toString(),
      name: item.name,
      stock: `${item.quantity} ${item.unit || ''}`.trim(),
      price: item.price ? `Rs. ${item.price.toLocaleString()}` : '-',
      urgency: item.quantity <= 3 ? 'CRITICAL' : (item.quantity < 5 ? 'URGENT' : 'REORDER'),
      options: {
        backgroundColor: item.quantity <= 3 ? '#FEF2F2' : (idx % 2 === 0 ? '#FFF7ED' : '#FFFFFF'),
        backgroundOpacity: 1,
      },
    }));

    rows.push({
      idx: '',
      name: 'TOTAL LOW STOCK ITEMS',
      stock: `${items.length} Products`,
      price: '',
      urgency: `${criticalCount} Critical`,
      isTotal: true,
      options: {
        backgroundColor: '#FFEDD5',
        backgroundOpacity: 1,
      },
    });

    const table = {
      headers: [
        { label: '#', property: 'idx', width: 35, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Item Description', property: 'name', width: 235, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'left', align: 'left' },
        { label: 'Remaining Stock', property: 'stock', width: 105, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
        { label: 'Unit Rate', property: 'price', width: 75, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
        { label: 'Urgency Status', property: 'urgency', width: 75, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
      ],
      datas: rows,
    };

    await doc.table(table, {
      x: 35,
      width: 525,
      padding: 7,
      divider: {
        header: { disabled: false, width: 1.5, opacity: 1, color: '#0F172A' },
        horizontal: { disabled: false, width: 0.5, opacity: 1, color: '#E2E8F0' },
        vertical: { disabled: false, width: 0.5, opacity: 0.5, color: '#E2E8F0' },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF'),
      prepareRow: (row) => {
        if (row.isTotal) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#7C2D12');
        } else if (row.urgency === 'CRITICAL') {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B91C1C');
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');
        }
      },
    });
  }

  applyFootersToAllPages(doc);
  doc.end();

  return { buffer: await createPdfBuffer(doc), filename: 'Low_Stock_Report.pdf' };
}

export async function generateExpiringReport(merchant) {
  const targetExpiry = new Date();
  targetExpiry.setDate(targetExpiry.getDate() + 45);
  const expiryThreshold = `${targetExpiry.getFullYear()}-${String(targetExpiry.getMonth() + 1).padStart(2, '0')}`;

  let items = await InventoryItem.find({ merchantId: merchant._id, expiryDates: { $lte: expiryThreshold } }).sort({ name: 1 });
  if (items && typeof items.limit === 'function') items = await items.limit();
  if (!Array.isArray(items)) items = [];

  const doc = new PDFDocument({ margins: { top: 35, bottom: 45, left: 35, right: 35 }, size: 'A4', bufferPages: true });
  drawHeader(doc, merchant, 'Expiring Stock Report (Next 45 Days)', '#E11D48');

  const rows = [];
  for (const item of (items || [])) {
    const nearingExpiry = (item.expiryDates || []).filter((d) => d <= expiryThreshold).sort();
    if (nearingExpiry.length > 0) {
      rows.push({
        name: item.name,
        dates: nearingExpiry.join(', '),
      });
    }
  }

  drawKpiCards(doc, [
    {
      label: 'Expiring Items',
      value: `${rows.length} Batches`,
      bgColor: '#FFF1F2',
      borderColor: '#FECDD3',
      labelColor: '#BE123C',
      valueColor: '#881337',
    },
    {
      label: 'Monitoring Window',
      value: '45 Days',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      labelColor: '#1D4ED8',
      valueColor: '#1E3A8A',
    },
    {
      label: 'Action Suggested',
      value: rows.length > 0 ? 'Discount / Clear' : 'No Action',
      bgColor: '#FDF4FF',
      borderColor: '#F5D0FE',
      labelColor: '#A21CAF',
      valueColor: '#701A75',
    },
  ]);

  if (rows.length === 0) {
    drawEmptyState(doc, 'No inventory is nearing expiration in the next 45 days.', 'Expiration dates tagged on products are monitored continuously.');
  } else {
    const tableRows = rows.map((r, idx) => ({
      idx: (idx + 1).toString(),
      name: r.name,
      dates: r.dates,
      status: 'NEAR EXPIRY',
      options: {
        backgroundColor: idx % 2 === 0 ? '#FFF1F2' : '#FFFFFF',
        backgroundOpacity: 1,
      },
    }));

    tableRows.push({
      idx: '',
      name: 'TOTAL EXPIRING BATCHES',
      dates: `${rows.length} Batches`,
      status: 'ACTION NEEDED',
      isTotal: true,
      options: {
        backgroundColor: '#FFE4E6',
        backgroundOpacity: 1,
      },
    });

    const table = {
      headers: [
        { label: '#', property: 'idx', width: 35, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Item Description', property: 'name', width: 245, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'left', align: 'left' },
        { label: 'Batch Expiry Date(s)', property: 'dates', width: 135, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Urgency Status', property: 'status', width: 110, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
      ],
      datas: tableRows,
    };

    await doc.table(table, {
      x: 35,
      width: 525,
      padding: 7,
      divider: {
        header: { disabled: false, width: 1.5, opacity: 1, color: '#0F172A' },
        horizontal: { disabled: false, width: 0.5, opacity: 1, color: '#E2E8F0' },
        vertical: { disabled: false, width: 0.5, opacity: 0.5, color: '#E2E8F0' },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF'),
      prepareRow: (row) => {
        if (row.isTotal) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#881337');
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');
        }
      },
    });
  }

  applyFootersToAllPages(doc);
  doc.end();

  return { buffer: await createPdfBuffer(doc), filename: 'Expiring_Report.pdf' };
}

export async function generateSalesReport(merchant) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let orders = await Order.find({ merchantId: merchant._id, createdAt: { $gte: today } }).sort({ createdAt: -1 });
  if (orders && typeof orders.limit === 'function') orders = await orders.limit();
  if (!Array.isArray(orders)) orders = [];

  const doc = new PDFDocument({ margins: { top: 35, bottom: 45, left: 35, right: 35 }, size: 'A4', bufferPages: true });
  drawHeader(doc, merchant, 'Daily Sales Report (Today)', '#059669');

  let totalRevenue = 0;
  const rows = orders.map((o, idx) => {
    const amt = o.total || 0;
    totalRevenue += amt;
    return {
      idx: (idx + 1).toString(),
      time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: (o.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Sale transaction',
      payment: (o.paymentMethod || 'cash').toUpperCase(),
      amount: `Rs. ${amt.toLocaleString()}`,
      options: {
        backgroundColor: idx % 2 === 0 ? '#F0FDF4' : '#FFFFFF',
        backgroundOpacity: 1,
      },
    };
  });

  const avgOrder = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  drawKpiCards(doc, [
    {
      label: 'Orders Logged Today',
      value: `${orders.length} Orders`,
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      labelColor: '#047857',
      valueColor: '#064E3B',
    },
    {
      label: 'Today Total Revenue',
      value: `PKR ${totalRevenue.toLocaleString()}`,
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      labelColor: '#1D4ED8',
      valueColor: '#1E3A8A',
    },
    {
      label: 'Average Order Value',
      value: `PKR ${avgOrder.toLocaleString()}`,
      bgColor: '#FAF5FF',
      borderColor: '#E9D5FF',
      labelColor: '#7E22CE',
      valueColor: '#581C87',
    },
  ]);

  if (orders.length === 0) {
    drawEmptyState(doc, 'No sales transactions recorded for today yet.', 'Transactions recorded via voice note or text appear in real-time.');
  } else {
    // Add summary totals row
    rows.push({
      idx: '',
      time: '',
      items: 'TOTAL SALES REVENUE',
      payment: `${orders.length} Orders`,
      amount: `Rs. ${totalRevenue.toLocaleString()}`,
      isTotal: true,
      options: {
        backgroundColor: '#ECFDF5',
        backgroundOpacity: 1,
      },
    });

    const table = {
      headers: [
        { label: '#', property: 'idx', width: 35, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Time', property: 'time', width: 65, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Items Ordered & Quantity', property: 'items', width: 210, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'left', align: 'left' },
        { label: 'Payment Method', property: 'payment', width: 105, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'center', align: 'center' },
        { label: 'Total Amount', property: 'amount', width: 110, headerColor: '#0F172A', headerOpacity: 1, headerAlign: 'right', align: 'right' },
      ],
      datas: rows,
    };

    await doc.table(table, {
      x: 35,
      width: 525,
      padding: 7,
      divider: {
        header: { disabled: false, width: 1.5, opacity: 1, color: '#0F172A' },
        horizontal: { disabled: false, width: 0.5, opacity: 1, color: '#E2E8F0' },
        vertical: { disabled: false, width: 0.5, opacity: 0.5, color: '#E2E8F0' },
      },
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF'),
      prepareRow: (row) => {
        if (row.isTotal) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#064E3B');
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');
        }
      },
    });
  }

  applyFootersToAllPages(doc);
  doc.end();

  return { buffer: await createPdfBuffer(doc), filename: 'Daily_Sales_Report.pdf' };
}
