import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import express from 'express';
import routes from '../src/routes.js';
import { Title, User } from '../src/models.js';

// Always use a new local test database, never the configured application database.
const uri = `mongodb://127.0.0.1:27017/video_portal_test_${randomUUID().replaceAll('-', '')}`;
const password = randomUUID();
let server;
const seed = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['src/seed.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, MONGO_URI: uri, ADMIN_EMAIL: 'test-admin@example.com', ADMIN_PASSWORD: password },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (s) => { output += s; });
  child.stderr.on('data', (s) => { output += s; });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(output)));
});
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const original = await Title.create({ name: 'Existing title', description: 'Keep me' });
  await seed();
  assert.equal(await Title.countDocuments(), 9);
  const sample = await Title.findOne({ name: 'Neon Harbor' });
  sample.description = 'User-edited description';
  await sample.save();
  await seed();
  assert.equal(await Title.countDocuments(), 9);
  assert.equal((await Title.findById(original.id)).description, 'Keep me');
  assert.equal((await Title.findById(sample.id)).description, 'User-edited description');
  assert.equal(await User.countDocuments(), 1);

  const app = express();
  app.use(express.json()); app.use('/api', routes);
  app.use((err, _req, res, _next) => res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message }));
  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  const login = await request('/auth/login', 'POST', { email: 'test-admin@example.com', password });
  assert.equal(login.status, 200);
  const token = login.data.token;
  assert.equal((await request('/titles', 'POST', { name: 'Unauthorised' })).status, 401);
  const member = await request('/auth/register', 'POST', { email: 'member@example.com', password });
  assert.equal((await request('/titles', 'POST', { name: 'Forbidden' }, member.data.token)).status, 403);
  for (const invalid of [{ name: ' ' }, { name: 'Bad URL', posterUrl: 'javascript:alert(1)' }, { name: 'Bad year', releaseYear: 2024.5 }, { name: 'Bad plan', minPlan: 'other' }]) {
    assert.equal((await request('/titles', 'POST', invalid, token)).status, 400);
  }
  const created = await request('/titles', 'POST', { name: 'A new movie', genres: ['Adventure'], cast: ['Sample Actor'], releaseYear: 2025, description: 'A new plot', minPlan: 'free' }, token);
  assert.equal(created.status, 201);
  const id = created.data._id;
  const results = await request('/titles?q=Sample%20Actor&genre=Adventure');
  assert.equal(results.data.total, 1);
  assert.equal(results.data.items[0]._id, id);
  assert.ok(!('streamUrl' in results.data.items[0]));
  assert.ok((await request('/titles/meta/genres')).data.includes('Adventure'));
  assert.equal((await request(`/titles/${id}`)).data.name, 'A new movie');
  assert.equal((await request(`/titles/${id}/stream`, 'GET', undefined, token)).status, 404);
  assert.equal((await request(`/titles/${id}`, 'PUT', { type: 'invalid' }, token)).status, 400);
  assert.equal((await request(`/titles/${new mongoose.Types.ObjectId()}`, 'PUT', { name: 'Missing' }, token)).status, 404);
  console.log('PASS: seed preserves data and IDs; admin login; access control; validation; save, search, genres and details; missing stream and update handling.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
