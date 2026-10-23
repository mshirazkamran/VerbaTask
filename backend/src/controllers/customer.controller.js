import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import { emitDashboardUpdate } from '../socket.js';
import Merchant from '../models/Merchant.js';
import { recordKhataPayment, getKhataStatement } from '../services/khata.service.js';
import { generateKhataReport } from '../services/report.service.js';
import { deliverKhataReport } from '../services/reportDelivery.service.js';
import { normalizePkMobile } from '../services/qwen.service.js';

/** Loads one customer of the signed-in merchant, or answers 400/404 and returns null. */
async function loadOwnCustomer(req, res) {
  if (!req.params?.id || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, error: { message: 'Invalid customer ID' } });
    return null;
  }
  const customer = await Customer.findOne({ _id: req.params.id, merchantId: req.merchantId });
  if (!customer) {
    res.status(404).json({ success: false, error: { message: 'Customer not found' } });
    return null;
  }
  return customer;
}

/**
 * GET /api/customers/:id/statement
 * The customer's khata: each udhaar purchase with date and items, each payment,
 * running balance, and totals.
 */
export async function getCustomerStatement(req, res) {
  try {
    const customer = await loadOwnCustomer(req, res);
    if (!customer) return;
    const { rows, totals } = await getKhataStatement(req.merchantId, customer);
    res.json({
      success: true,
      data: {
        customer: { _id: customer._id, name: customer.name, phone: customer.phone, balance: customer.balance },
        rows,
        totals,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/** GET /api/customers/:id/statement/pdf — the same khata PDF the WhatsApp bot sends. */
export async function downloadCustomerStatement(req, res) {
  try {
    const customer = await loadOwnCustomer(req, res);
    if (!customer) return;
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found' } });
    }
    const report = await generateKhataReport(merchant, customer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.setHeader('Content-Length', report.buffer.length);
    return res.end(report.buffer);
  } catch (err) {
    console.error('downloadCustomerStatement failed:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/** POST /api/customers/:id/statement/whatsapp — sends the khata PDF to the merchant's WhatsApp. */
export async function sendCustomerStatementToWhatsapp(req, res) {
  try {
    const customer = await loadOwnCustomer(req, res);
    if (!customer) return;
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: { message: 'Merchant not found' } });
    }
    if (!merchant.whatsappNumber || merchant.whatsappNumber.startsWith('unlinked_')) {
      return res.status(400).json({
        success: false,
        error: { message: 'No WhatsApp number is linked to this account. Link it in Settings or download the PDF.' },
      });
    }

    const result = await deliverKhataReport(merchant, customer, merchant.language || 'ur', { announce: false });
    if (!result?.success) {
      return res.status(500).json({
        success: false,
        error: { message: `Could not send the khata report to WhatsApp${result?.error ? ` (${result.error})` : ''}. Try downloading the PDF.` },
      });
    }
    res.json({ success: true, data: { recipient: merchant.whatsappNumber } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

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

    // A khata is never opened without a reachable phone number (same rule as on WhatsApp).
    const normalizedPhone = normalizePkMobile(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: { message: 'A valid Pakistani mobile number (e.g. 03001234567) is required to open a khata' },
      });
    }

    const normalizedName = name.trim().toLowerCase();
    const existing = await Customer.findOne({ merchantId: req.merchantId, name: normalizedName });

    const phoneOwner = await Customer.findOne({ merchantId: req.merchantId, phone: normalizedPhone });
    if (phoneOwner && (!existing || String(phoneOwner._id) !== String(existing._id))) {
      return res.status(400).json({
        success: false,
        error: { message: `This phone number already belongs to ${phoneOwner.name}'s khata` },
      });
    }

    if (existing) {
      // Consolidate: Add the new balance to their existing balance
      const additionalBalance = Math.max(0, Number(balance) || 0);
      existing.balance = (Number(existing.balance) || 0) + additionalBalance;
      existing.phone = normalizedPhone;
      await existing.save();

      emitDashboardUpdate(req.merchantId, {
        type: 'customer',
        action: 'update',
        customerId: existing._id,
        customerName: existing.name,
        balance: existing.balance,
      });

      return res.status(200).json({ success: true, data: existing, consolidated: true });
    }

    const customer = await Customer.create({
      merchantId: req.merchantId,
      name: normalizedName,
      phone: normalizedPhone,
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
    if (!req.params?.id) {
      return res.status(400).json({ success: false, error: { message: 'Customer ID is required' } });
    }

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

    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const normalizedPhone = normalizePkMobile(phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          error: { message: 'Enter a valid Pakistani mobile number (e.g. 03001234567)' },
        });
      }
      customer.phone = normalizedPhone;
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
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: { message: 'Invalid customer ID' } });
    }
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function deleteCustomer(req, res) {
  try {
    if (!req.params?.id) {
      return res.status(400).json({ success: false, error: { message: 'Customer ID is required' } });
    }

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
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: { message: 'Invalid customer ID' } });
    }
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function settleBalance(req, res) {
  try {
    const { amount } = req.body || {};
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ success: false, error: { message: 'Invalid amount' } });
    }

    if (!req.params?.id) {
      return res.status(400).json({ success: false, error: { message: 'Customer ID is required' } });
    }

    const customer = await Customer.findOne({ _id: req.params.id, merchantId: req.merchantId });
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
    }

    const previousBalance = Number(customer.balance) || 0;
    const appliedAmount = Math.min(amountNum, Math.max(0, previousBalance));
    customer.balance = Math.max(0, previousBalance - amountNum);
    await customer.save();

    if (appliedAmount > 0) {
      await recordKhataPayment({
        merchantId: req.merchantId,
        customerId: customer._id,
        amount: appliedAmount,
        balanceAfter: customer.balance,
        source: 'dashboard',
      });
    }

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
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: { message: 'Invalid customer ID' } });
    }
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

