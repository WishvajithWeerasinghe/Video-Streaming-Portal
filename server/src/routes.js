import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Title, Subscription, Watch } from './models.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const RANK = { free: 0, basic: 1, premium: 2 };
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '7d' });
const authed = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'Log in to continue' }); }
};
const admin = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' }));
const planOf = async (uid) => {
  const s = await Subscription.findOne({ userId: uid, status: 'active' }).sort({ startDate: -1 });
  return s && s.endDate > new Date() ? s.plan : 'free';
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const r = Router();

// ---- auth ----
r.post('/auth/register', wrap(async (req, res) => {
  const { email = '', password = '' } = req.body;
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'That email is already registered' });
  const u = await User.create({ email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(u), user: { email: u.email, role: u.role } });
}));

r.post('/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.passwordHash)))
    return res.status(401).json({ error: 'Email or password is incorrect' });
  res.json({ token: sign(u), user: { email: u.email, role: u.role } });
}));

// ---- catalog ----
r.get('/titles/meta/genres', wrap(async (_req, res) => res.json((await Title.distinct('genres')).sort())));

r.get('/titles', wrap(async (req, res) => {
  const { q, genre, year } = req.query;
  const page = Math.max(1, +req.query.page || 1), limit = 12;
  const f = {};
  if (q) { const rx = new RegExp(esc(String(q)), 'i'); f.$or = [{ name: rx }, { cast: rx }, { description: rx }]; }
  if (genre) f.genres = genre;
  if (year) f.releaseYear = +year;
  const [items, total] = await Promise.all([
    Title.find(f).sort({ releaseYear: -1, name: 1 }).skip((page - 1) * limit).limit(limit).select('-streamUrl'),
    Title.countDocuments(f),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

r.get('/titles/:id', wrap(async (req, res) => {
  const t = await Title.findById(req.params.id).select('-streamUrl');
  t ? res.json(t) : res.status(404).json({ error: 'Title not found' });
}));

// Access check happens here; only entitled users ever receive a stream URL.
r.get('/titles/:id/stream', authed, wrap(async (req, res) => {
  const t = await Title.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Title not found' });
  if (RANK[await planOf(req.user.id)] < RANK[t.minPlan])
    return res.status(403).json({ error: `This title needs the ${t.minPlan} plan`, needPlan: t.minPlan });
  const w = await Watch.findOne({ userId: req.user.id, titleId: t.id });
  res.json({ url: t.streamUrl, resume: w?.progressSeconds || 0 });
}));

r.post('/titles', authed, admin, wrap(async (req, res) => res.status(201).json(await Title.create(req.body))));
r.put('/titles/:id', authed, admin, wrap(async (req, res) =>
  res.json(await Title.findByIdAndUpdate(req.params.id, req.body, { new: true }))));

// ---- subscriptions ----
r.get('/subscription', authed, wrap(async (req, res) => res.json({ plan: await planOf(req.user.id) })));
r.post('/subscription', authed, wrap(async (req, res) => {
  const { plan } = req.body;
  if (!['basic', 'premium'].includes(plan)) return res.status(400).json({ error: 'Choose basic or premium' });
  await Subscription.updateMany({ userId: req.user.id, status: 'active' }, { status: 'cancelled' });
  await Subscription.create({ userId: req.user.id, plan, endDate: new Date(Date.now() + 30 * 864e5) });
  res.json({ plan });
}));
r.delete('/subscription', authed, wrap(async (req, res) => {
  await Subscription.updateMany({ userId: req.user.id, status: 'active' }, { status: 'cancelled' });
  res.json({ plan: 'free' });
}));

// ---- watch history ----
r.get('/watch', authed, wrap(async (req, res) =>
  res.json(await Watch.find({ userId: req.user.id }).sort({ updatedAt: -1 }).limit(30).populate('titleId', '-streamUrl'))));
r.put('/watch/:titleId', authed, wrap(async (req, res) => {
  await Watch.findOneAndUpdate({ userId: req.user.id, titleId: req.params.titleId },
    { progressSeconds: Math.max(0, +req.body.progressSeconds || 0) }, { upsert: true });
  res.json({ ok: true });
}));

export default r;
