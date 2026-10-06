import Customer from '../models/Customer.js';

export async function getCustomers(req, res) {
  try {
    const customers = await Customer.find({ merchantId: req.merchantId }).sort({ balance: -1, name: 1 });
    res.json({ success: true, data: customers });
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

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
