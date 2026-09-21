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

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/video_portal');
await Title.deleteMany({});
await Title.insertMany(data);
if (!(await User.findOne({ email: 'admin@example.com' })))
  await User.create({ email: 'admin@example.com', passwordHash: await bcrypt.hash('admin123', 10), role: 'admin' });
console.log(`Seeded ${data.length} titles. Admin: admin@example.com / admin123`);
await mongoose.disconnect();
