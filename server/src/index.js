import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import routes from './routes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Used by the ALB target-group health check (and shows which color served you).
app.get('/health', (_req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({
    status: db ? 'ok' : 'degraded',
    version: process.env.APP_VERSION || 'dev',
    color: process.env.DEPLOY_COLOR || 'local',
  });
});
app.use('/api', routes);
app.use((e, _req, res, _next) => {
  if (e.name === 'CastError') return res.status(404).json({ error: 'Not found' });
  console.error(e);
  res.status(500).json({ error: 'Something went wrong' });
});

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/video_portal');
const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`API on :${port}`));

// Graceful shutdown: stop taking new requests, let in-flight ones finish.
process.on('SIGTERM', () => {
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 25000).unref();
});
