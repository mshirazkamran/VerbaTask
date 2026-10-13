import Customer from '../models/Customer.js';
import { emitDashboardUpdate } from '../socket.js';

export async function getCustomers(req, res) {
  try {
    const customers = await Customer.find({ merchantId: req.merchantId }).sort({ balance: -1, name: 1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function createCustomer(req, res) {
  try {
    const { name, phone, balance } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Customer name is required' } });
    }

    const normalizedName = name.trim().toLowerCase();
    const existing = await Customer.findOne({ merchantId: req.merchantId, name: normalizedName });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { message: 'A customer with this name already exists in your ledger' },
      });
    }

    const customer = await Customer.create({
      merchantId: req.merchantId,
      name: normalizedName,
      phone: phone ? String(phone).trim() : undefined,
      balance: Math.max(0, Number(balance) || 0),
    });

    emitDashboardUpdate(req.merchantId, {
      type: 'customer',
      action: 'create',
      customerId: customer._id,
      customerName: customer.name,
      balance: customer.balance,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function updateCustomer(req, res) {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, merchantId: req.merchantId });
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
    }

    const { name, phone, balance } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim().toLowerCase();
      if (!trimmedName) {
        return res.status(400).json({ success: false, error: { message: 'Customer name cannot be empty' } });
      }
      const existing = await Customer.findOne({
        merchantId: req.merchantId,
        name: trimmedName,
        _id: { $ne: customer._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: { message: 'Another customer with this name already exists' },
        });
      }
      customer.name = trimmedName;
    }

    if (phone !== undefined) {
      customer.phone = phone ? String(phone).trim() : undefined;
    }

    if (balance !== undefined) {
      const numBalance = Number(balance);
      if (isNaN(numBalance) || numBalance < 0) {
        return res.status(400).json({ success: false, error: { message: 'Balance must be a positive number or zero' } });
      }
      customer.balance = numBalance;
    }

    await customer.save();

    emitDashboardUpdate(req.merchantId, {
      type: 'customer',
      action: 'update',
      customerId: customer._id,
      customerName: customer.name,
      balance: customer.balance,
    });

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function deleteCustomer(req, res) {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, merchantId: req.merchantId });
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
    }

    emitDashboardUpdate(req.merchantId, {
      type: 'customer',
      action: 'delete',
      customerId: req.params.id,
      customerName: customer.name,
    });

    res.json({ success: true, message: 'Customer deleted from ledger' });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function settleBalance(req, res) {
  try {
    const { amount } = req.body;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ success: false, error: { message: 'Invalid amount' } });
    }

    const customer = await Customer.findOne({ _id: req.params.id, merchantId: req.merchantId });
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
    }

    customer.balance = Math.max(0, customer.balance - amountNum);
    await customer.save();

    emitDashboardUpdate(req.merchantId, {
      type: 'customer',
      action: 'settle',
      customerId: customer._id,
      customerName: customer.name,
      amount: amountNum,
      balance: customer.balance,
    });

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

