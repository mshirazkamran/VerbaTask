import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';

export async function generateClientReportPdf(type, merchant = {}) {
  const doc = new jsPDF();
  const shopName = merchant.businessName || 'VerbaTask Store';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(shopName, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${dateStr} · Powered by VerbaTask`, 14, 27);

  let title = 'BUSINESS REPORT';
  let head = [];
  let rows = [];

  if (type === 'sales' || type === 'top_selling') {
    title = type === 'sales' ? 'SALES & REVENUE REPORT' : 'TOP SELLING ITEMS REPORT';
    const ordersRes = await api.get('/api/orders').catch(() => []);
    const orders = Array.isArray(ordersRes) ? ordersRes : [];

    let totalRevenue = 0;
    head = [['Order ID', 'Items & Qty', 'Payment', 'Total (PKR)', 'Date']];

    rows = orders.slice(0, 50).map((o) => {
      totalRevenue += o.totalAmount || 0;
      const itemsSummary = (o.items || [])
        .map((i) => `${i.name} (x${i.quantity})`)
        .join(', ');
      return [
        o._id ? `#${o._id.slice(-6).toUpperCase()}` : '—',
        itemsSummary || 'General Sale',
        (o.paymentMethod || 'cash').toUpperCase(),
        `Rs. ${(o.totalAmount || 0).toLocaleString()}`,
        o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—',
      ];
    });

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(title, 14, 38);

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Orders: ${orders.length}   |   Total Sales: Rs. ${totalRevenue.toLocaleString()}`, 14, 46);

    autoTable(doc, {
      startY: 52,
      head,
      body: rows.length ? rows : [['No orders recorded yet', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });
  } else {
    // Inventory types: inventory, low_stock, expiring
    const itemsRes = await api.get('/api/inventory').catch(() => []);
    let items = Array.isArray(itemsRes) ? itemsRes : [];

    if (type === 'low_stock') {
      title = 'LOW STOCK ALERT REPORT';
      items = items.filter((i) => (i.quantity || 0) <= (i.threshold || 5));
    } else if (type === 'expiring') {
      title = 'EXPIRING INVENTORY REPORT';
      const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
      items = items.filter((i) =>
        (i.expiryDates || []).some((d) => new Date(d).getTime() <= thirtyDays)
      );
    } else {
      title = 'FULL INVENTORY CATALOG';
    }

    head = [['Item Name', 'Current Stock', 'Unit Rate (PKR)', 'Unit', 'Status']];
    rows = items.map((i) => {
      const isLow = (i.quantity || 0) <= (i.threshold || 5);
      return [
        i.name || 'Unnamed',
        `${i.quantity || 0}`,
        `Rs. ${(i.price || 0).toLocaleString()}`,
        i.unit || 'pcs',
        isLow ? 'LOW STOCK' : 'IN STOCK',
      ];
    });

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(title, 14, 38);

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Items Listed: ${items.length}`, 14, 46);

    autoTable(doc, {
      startY: 52,
      head,
      body: rows.length ? rows : [['No items found matching filter', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });
  }

  const filename = `${type}_report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
