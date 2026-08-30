import Order from '../models/Order.js';
import InventoryItem from '../models/InventoryItem.js';
import Approval from '../models/Approval.js';
import Workflow from '../models/Workflow.js';

const LOW_STOCK_THRESHOLD = 10;

/**
 * Aggregate dashboard data for the authenticated merchant.
 * Returns counts and recent items needed by the frontend overview screen.
 */
export const getDashboardOverview = async (req, res) => {
  try {
    const merchantId = req.merchantId || req.merchant?._id;
    if (!merchantId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      lowStockItems,
      pendingApprovals,
      recentOrders,
      activeWorkflows,
    ] = await Promise.all([
      Order.find({
        merchantId,
        status: { $in: ['completed', 'approved'] },
        createdAt: { $gte: startOfDay },
      }).lean(),
      InventoryItem.find({
        merchantId,
        quantity: { $lt: LOW_STOCK_THRESHOLD },
      })
        .sort({ quantity: 1 })
        .limit(10)
        .lean(),
      Approval.countDocuments({ merchantId, status: 'pending' }),
      Order.find({ merchantId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Workflow.countDocuments({ merchantId, active: true }),
    ]);

    const todaySales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    // Profit data isn't tracked yet; mirror sales as a placeholder for the demo.
    const todayProfit = todaySales;

    res.json({
      success: true,
      data: {
        todaySales,
        todayProfit,
        todayOrdersCount: todayOrders.length,
        lowStockItems,
        pendingApprovals,
        recentOrders,
        activeWorkflows,
      },
    });
  } catch (err) {
    console.error('getDashboardOverview error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
};
