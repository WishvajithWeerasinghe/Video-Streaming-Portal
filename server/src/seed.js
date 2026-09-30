import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Title } from './models.js';

try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/video_portal');
  let inserted = 0;
  for (const title of data) {
    const result = await Title.updateOne(
      { name: title.name, type: title.type },
      { $setOnInsert: title },
      { upsert: true, runValidators: true },
    );
    inserted += result.upsertedCount;
  }
  console.log(`Added ${inserted} sample titles; existing titles were preserved.`);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
      throw new Error('Use a valid ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters.');
    const existing = await User.findOne({ email });
    if (!existing) {
      await User.create({ email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
      console.log('Created the configured admin account.');
    } else {
      console.log(`The configured account already exists with role ${existing.role}; it was not changed.`);
    }
  } else {
    console.log('To create an admin, set both ADMIN_EMAIL and ADMIN_PASSWORD in server/.env and run again.');
  }
} catch (error) {
  console.error('Could not finish loading sample data:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
