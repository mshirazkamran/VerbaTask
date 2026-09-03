import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const items = await mongoose.connection.db.collection('inventoryitems')
      .find({ expiryDates: { $exists: true, $ne: [] } })
      .toArray();
    console.log('Expiring items:', items.map(i => ({name: i.name, exp: i.expiryDates})));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
});
