import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import { formatBusinessName } from './format';

export async function generateClientReportPdf(type, merchant = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = formatBusinessName(merchant.businessName, merchant.location) || merchant.businessName || 'VerbaTask Store';
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

  let title = 'BUSINESS REPORT';
  let themeColor = [37, 99, 235]; // Blue default
  let head = [];
  let rows = [];
  let foot = [];
  let summaryText = '';

  if (type === 'sales') {
    title = 'DAILY SALES REPORT';
    themeColor = [5, 150, 105]; // Emerald
    const ordersRes = await api.get('/api/orders').catch(() => []);
    const orders = Array.isArray(ordersRes) ? ordersRes : [];

    let totalRevenue = 0;
    head = [['#', 'Time', 'Items Ordered & Qty', 'Payment Method', 'Amount (PKR)']];

    rows = orders.slice(0, 100).map((o, idx) => {
      const amt = o.totalAmount || o.total || 0;
      totalRevenue += amt;
      const itemsSummary = (o.items || [])
        .map((i) => `${i.quantity || 1}x ${i.name}`)
        .join(', ');
      const timeOnly = o.createdAt
        ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
      return [
        (idx + 1).toString(),
        timeOnly,
        itemsSummary || 'General Sale Transaction',
        (o.paymentMethod || 'cash').toUpperCase(),
        `Rs. ${amt.toLocaleString()}`,
      ];
    });

    summaryText = `Total Orders Logged: ${orders.length}   |   Total Sales Revenue: PKR ${totalRevenue.toLocaleString()}`;
    foot = [['', '', 'TOTAL SALES REVENUE', `${orders.length} Orders`, `Rs. ${totalRevenue.toLocaleString()}`]];

  } else if (type === 'top_selling') {
    title = 'TOP SELLING ITEMS REPORT';
    themeColor = [79, 70, 229]; // Indigo
    const ordersRes = await api.get('/api/orders').catch(() => []);
    const orders = Array.isArray(ordersRes) ? ordersRes : [];

    const map = {};
    for (const o of orders) {
      for (const item of (o.items || [])) {
        const name = item.name || 'Unknown Item';
        const qty = item.quantity || 1;
        const price = item.price || 0;
        if (!map[name]) map[name] = { totalSold: 0, revenue: 0 };
        map[name].totalSold += qty;
        map[name].revenue += price * qty;
      }
    }

    const sorted = Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 50);

    const totalSoldAll = sorted.reduce((sum, i) => sum + i.totalSold, 0);
    const totalRevAll = sorted.reduce((sum, i) => sum + i.revenue, 0);

    head = [['#', 'Item Description', 'Total Units Sold', 'Revenue Generated (PKR)']];
    rows = sorted.map((item, idx) => [
      (idx + 1).toString(),
      item.name,
      `${item.totalSold} Units`,
      `Rs. ${item.revenue.toLocaleString()}`,
    ]);

    summaryText = `Ranked Items: ${sorted.length}   |   Volume Sold: ${totalSoldAll} Units   |   Revenue: PKR ${totalRevAll.toLocaleString()}`;
    foot = [['', 'TOTAL SALES VOLUME & REVENUE', `${totalSoldAll} Units`, `Rs. ${totalRevAll.toLocaleString()}`]];

  } else {
    // Inventory types: inventory, low_stock, expiring
    const itemsRes = await api.get('/api/inventory').catch(() => []);
    let items = Array.isArray(itemsRes) ? itemsRes : [];

    if (type === 'low_stock') {
      title = 'LOW STOCK ALERT REPORT (<10 ITEMS)';
      themeColor = [234, 88, 12]; // Orange
      items = items.filter((i) => (i.quantity || 0) < 10).sort((a, b) => (a.quantity || 0) - (b.quantity || 0));

      const criticalCount = items.filter((i) => (i.quantity || 0) < 5).length;
      summaryText = `Low Stock Alerts: ${items.length} Products   |   Critical Under 5: ${criticalCount} Products`;

      head = [['#', 'Item Description', 'Remaining Stock', 'Unit Rate (PKR)', 'Urgency Status']];
      rows = items.map((i, idx) => {
        const qty = i.quantity || 0;
        return [
          (idx + 1).toString(),
          i.name || 'Unnamed Product',
          `${qty} ${i.unit || 'pcs'}`.trim(),
          i.price ? `Rs. ${Number(i.price).toLocaleString()}` : '—',
          qty <= 3 ? 'CRITICAL (<3)' : (qty < 5 ? 'URGENT (<5)' : 'REORDER (<10)'),
        ];
      });

      foot = [['', 'TOTAL LOW STOCK ITEMS', `${items.length} Products`, '', `${criticalCount} Critical`]];

    } else if (type === 'expiring') {
      title = 'EXPIRING INVENTORY REPORT (NEXT 45 DAYS)';
      themeColor = [225, 29, 72]; // Rose
      const targetExpiry = new Date();
      targetExpiry.setDate(targetExpiry.getDate() + 45);
      const thresholdStr = `${targetExpiry.getFullYear()}-${String(targetExpiry.getMonth() + 1).padStart(2, '0')}`;

      const expiringItems = [];
      for (const item of items) {
        const nearing = (item.expiryDates || []).filter((d) => d <= thresholdStr).sort();
        if (nearing.length > 0) {
          expiringItems.push({
            name: item.name,
            dates: nearing.join(', '),
          });
        }
      }

      summaryText = `Expiring Batches Identified: ${expiringItems.length} Products   |   Monitoring Window: 45 Days`;
      head = [['#', 'Item Description', 'Batch Expiry Date(s)', 'Action Required']];
      rows = expiringItems.map((i, idx) => [
        (idx + 1).toString(),
        i.name || 'Unnamed Product',
        i.dates,
        'DISCOUNT / CLEAR',
      ]);

      foot = [['', 'TOTAL EXPIRING BATCHES', `${expiringItems.length} Products`, 'ACTION NEEDED']];

    } else {
      title = 'FULL INVENTORY STOCK REPORT';
      themeColor = [37, 99, 235]; // Blue
      items = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const totalVal = items.reduce((sum, i) => sum + (i.price && i.quantity ? i.price * i.quantity : 0), 0);

      summaryText = `Catalog Items: ${items.length} Products   |   Total Units: ${totalQty.toLocaleString()}   |   Valuation: PKR ${totalVal.toLocaleString()}`;
      head = [['#', 'Item Description', 'Current Stock', 'Unit Price (PKR)', 'Total Value (PKR)']];
      rows = items.map((i, idx) => [
        (idx + 1).toString(),
        i.name || 'Unnamed',
        `${i.quantity || 0} ${i.unit || 'pcs'}`.trim(),
        i.price ? `Rs. ${Number(i.price).toLocaleString()}` : '—',
        i.price && i.quantity ? `Rs. ${(i.price * i.quantity).toLocaleString()}` : '—',
      ]);

      foot = [['', 'TOTAL INVENTORY VALUATION', `${totalQty} Units`, '', `Rs. ${totalVal.toLocaleString()}`]];
    }
  }

  // Header Drawing Function
  const renderHeader = (d) => {
    // Top accent line
    d.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    d.rect(14, 10, 182, 2, 'F');

    // 1. VerbaTask ON TOP BIG BOLD
    d.setFont('helvetica', 'bold');
    d.setFontSize(22);
    d.setTextColor(15, 23, 42);
    d.text('VerbaTask', 14, 21);

    // Store Name on top right
    d.setFont('helvetica', 'bold');
    d.setFontSize(11);
    d.setTextColor(51, 65, 85);
    d.text(shopName, 196, 21, { align: 'right' });

    // 2. Below that: Report Name
    d.setFont('helvetica', 'bold');
    d.setFontSize(12);
    d.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
    d.text(title.toUpperCase(), 14, 29);

    // 3. Below that: Date & Time
    d.setFont('helvetica', 'normal');
    d.setFontSize(8.5);
    d.setTextColor(100, 116, 139);
    d.text(`Date: ${dateStr}   •   Time: ${timeStr}`, 14, 35);

    d.setFontSize(8);
    d.setTextColor(148, 163, 184);
    d.text('Retail Ledger & Inventory Intelligence', 196, 35, { align: 'right' });

    // Header separator line
    d.setDrawColor(226, 232, 240);
    d.setLineWidth(0.35);
    d.line(14, 38, 196, 38);

    // KPI / Summary Bar
    if (summaryText) {
      d.setFont('helvetica', 'bold');
      d.setFontSize(8.5);
      d.setTextColor(30, 41, 59);
      d.text(summaryText, 14, 44);
    }
  };

  renderHeader(doc);

  // AutoTable
  autoTable(doc, {
    startY: 47,
    head,
    body: rows.length ? rows : [['', 'No matching records found for this report period', '', '', '']],
    foot: rows.length && foot.length ? foot : undefined,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [238, 242, 255],
      textColor: [30, 27, 75],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
    },
    didDrawPage: (data) => {
      // Add footer on every page
      const pageCount = doc.internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(14, 285, 196, 285);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('VerbaTask', 14, 289);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('  •  Smart Retail & WhatsApp ERP  •  verbatask.com', 30, 289);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        pageCount > 1 ? `Page ${currentPage} of ${pageCount}` : 'Confidential Store Report',
        196,
        289,
        { align: 'right' }
      );
    },
  });

  const filename = `${type}_report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
