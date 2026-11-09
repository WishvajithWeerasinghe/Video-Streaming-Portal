import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Playlist, Subscription, Title, User, Watch } from './models.js';

const sampleStreams = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
];

const sampleTitles = [
  ['Neon Harbor', 'movie', ['Thriller', 'Drama'], ['Mara Velez', 'Idris Cole'], 2024, 'free', 'A night-shift dockworker finds a ledger that names half the city.'],
  ['The Quiet Orbit', 'movie', ['Sci-Fi', 'Drama'], ['Anika Rao', 'Tom Wexler'], 2023, 'basic', 'Three astronauts, one failing relay, and a message nobody sent.'],
  ['Salt & Ember', 'series', ['Drama'], ['Lucia Ferro', 'Ben Okafor'], 2022, 'basic', 'A family restaurant fights to survive its most famous review.'],
  ['Paper Kingdoms', 'movie', ['Animation', 'Family'], ['Ivy Chen'], 2021, 'free', 'A folded-paper prince crosses a table-top world before the rain.'],
  ['Last Train to Halden', 'movie', ['Thriller'], ['Oskar Lind', 'Mara Velez'], 2024, 'premium', 'Six strangers, one locked carriage, and a stop that is not on the map.'],
  ['Field Notes', 'series', ['Documentary'], ['Dr. Sam Adeyemi'], 2020, 'free', 'A botanist follows one river from glacier to sea.'],
  ['Copper Sky', 'movie', ['Sci-Fi', 'Thriller'], ['Anika Rao', 'Idris Cole'], 2025, 'premium', 'The sun turns copper and a small-town radio host is the only one still broadcasting.'],
  ['Midnight Bakers', 'series', ['Comedy'], ['Ben Okafor', 'Ivy Chen'], 2023, 'free', 'Two rival bakeries share one wall and one very loud oven.'],
].map(([name, type, genres, cast, releaseYear, minPlan, description], index) => ({
  name, type, genres, cast, releaseYear, minPlan, description,
  streamUrl: sampleStreams[index % sampleStreams.length],
}));

const snapshotVersion = 1;
const defaultSnapshotPath = fileURLToPath(new URL('../seed-data.json', import.meta.url));
const collections = {
  users: User,
  titles: Title,
  subscriptions: Subscription,
  watches: Watch,
  playlists: Playlist,
};

function usage() {
  return 'Usage: node src/seed.js [--export [file] | --import [file]]';
}

function parseCommand(args) {
  const [command, file, ...extra] = args;
  if (extra.length || (command && !['--export', '--import'].includes(command)))
    throw new Error(usage());
  return {
    command: command || '--samples',
    file: path.resolve(file || defaultSnapshotPath),
  };
}

async function exportSnapshot(file) {
  const snapshot = {
    format: 'reelhouse-database-seed',
    version: snapshotVersion,
    exportedAt: new Date().toISOString(),
    collections: {},
  };

  for (const [name, Model] of Object.entries(collections)) {
    snapshot.collections[name] = await Model.find({}).lean();
  }

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const totals = Object.entries(snapshot.collections).map(([name, records]) => `${name}: ${records.length}`);
  console.log(`Exported ${totals.join(', ')} to ${file}`);
}

async function importSnapshot(file) {
  const snapshot = JSON.parse(await readFile(file, 'utf8'));
  if (snapshot?.format !== 'reelhouse-database-seed' || snapshot.version !== snapshotVersion)
    throw new Error(`Unsupported seed file. Expected reelhouse-database-seed version ${snapshotVersion}.`);
  if (!snapshot.collections || typeof snapshot.collections !== 'object')
    throw new Error('Seed file is missing its collections object.');

  const operations = [];
  for (const [name, Model] of Object.entries(collections)) {
    const records = snapshot.collections[name];
    if (!Array.isArray(records)) throw new Error(`Seed file is missing the ${name} array.`);
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || record._id == null)
        throw new Error(`Every ${name} record must be an object with an _id.`);
    }
    operations.push({ name, Model, records });
  }

  for (const { name, Model, records } of operations) {
    if (!records.length) continue;
    const writes = records.map((record) => {
      // Hydration casts JSON strings back to ObjectIds and dates. The native
      // collection write then preserves the imported timestamps as-is.
      const replacement = new Model(record).toObject({ depopulate: true });
      return {
        replaceOne: {
          filter: { _id: replacement._id },
          replacement,
          upsert: true,
        },
      };
    });
    await Model.collection.bulkWrite(writes, { ordered: true });
    console.log(`Imported ${records.length} ${name} record${records.length === 1 ? '' : 's'}.`);
  }
  console.log('Import complete. Existing records with matching IDs were updated; other records were preserved.');
}

async function seedSamples() {
  let inserted = 0;
  for (const title of sampleTitles) {
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
}

try {
  const { command, file } = parseCommand(process.argv.slice(2));
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/video_portal');
  if (command === '--export') await exportSnapshot(file);
  else if (command === '--import') await importSnapshot(file);
  else await seedSamples();
} catch (error) {
  console.error('Could not finish database seeding:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
