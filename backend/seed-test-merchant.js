import 'dotenv/config';
import mongoose from 'mongoose';
import Merchant from './src/models/Merchant.js';
import InventoryItem from './src/models/InventoryItem.js';

const TEST_NUMBER = '923053331098'; // Pakistani number, E.164 without +

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const merchant = await Merchant.findOneAndUpdate(
    { whatsappNumber: TEST_NUMBER },
    {
      whatsappNumber: TEST_NUMBER,
      businessName: 'Soban Test Store',
      language: 'en',
      onboardingComplete: true,
    },
    { upsert: true, new: true }
  );

  console.log('Merchant seeded:', merchant._id.toString(), merchant.whatsappNumber);

  const items = [
    { name: 'Rice Bag', quantity: 100, price: 150, unit: 'bag' },
    { name: 'Sugar', quantity: 50, price: 100, unit: 'kg' },
    { name: 'Laptop', quantity: 10, price: 50000, unit: 'piece' },
  ];

  for (const item of items) {
    await InventoryItem.findOneAndUpdate(
      { merchantId: merchant._id, name: item.name },
      { merchantId: merchant._id, ...item },
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded ${items.length} inventory items.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
