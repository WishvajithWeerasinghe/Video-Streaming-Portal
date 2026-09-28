import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Title } from './models.js';

const S = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
];
const data = [
  ['Neon Harbor', 'movie', ['Thriller', 'Drama'], ['Mara Velez', 'Idris Cole'], 2024, 'free', 'A night-shift dockworker finds a ledger that names half the city.'],
  ['The Quiet Orbit', 'movie', ['Sci-Fi', 'Drama'], ['Anika Rao', 'Tom Wexler'], 2023, 'basic', 'Three astronauts, one failing relay, and a message nobody sent.'],
  ['Salt & Ember', 'series', ['Drama'], ['Lucia Ferro', 'Ben Okafor'], 2022, 'basic', 'A family restaurant fights to survive its most famous review.'],
  ['Paper Kingdoms', 'movie', ['Animation', 'Family'], ['Ivy Chen'], 2021, 'free', 'A folded-paper prince crosses a table-top world before the rain.'],
  ['Last Train to Halden', 'movie', ['Thriller'], ['Oskar Lind', 'Mara Velez'], 2024, 'premium', 'Six strangers, one locked carriage, and a stop that is not on the map.'],
  ['Field Notes', 'series', ['Documentary'], ['Dr. Sam Adeyemi'], 2020, 'free', 'A botanist follows one river from glacier to sea.'],
  ['Copper Sky', 'movie', ['Sci-Fi', 'Thriller'], ['Anika Rao', 'Idris Cole'], 2025, 'premium', 'The sun turns copper and a small-town radio host is the only one still broadcasting.'],
  ['Midnight Bakers', 'series', ['Comedy'], ['Ben Okafor', 'Ivy Chen'], 2023, 'free', 'Two rival bakeries share one wall and one very loud oven.'],
].map(([name, type, genres, cast, releaseYear, minPlan, description], i) =>
  ({ name, type, genres, cast, releaseYear, minPlan, description, streamUrl: S[i % S.length] }));

// Insert missing sample titles only. Preserve existing records and their IDs.
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
