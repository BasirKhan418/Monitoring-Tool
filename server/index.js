import express from 'express';
import Redis from 'ioredis';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const redis = new Redis(process.env.REDIS_URL);

const subscriber = new Redis(process.env.REDIS_URL);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startTime = Date.now();

// Redis subscription
subscriber.subscribe('stats-channel');
subscriber.on('message', async (channel, message) => {
  const parsed = JSON.parse(message);
 
  const { clientId, data, timestamp } = parsed;
 
  const key = `client:${clientId}`;
  
  // Store each record in a sorted set with timestamp
  await redis.zadd(key, timestamp, JSON.stringify({ timestamp, data }));

  // Remove old data older than 30 minutes
  const threshold = Date.now() - 30 * 60 * 1000;
  await redis.zremrangebyscore(key, 0, threshold);
});

// Serve UI
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.get('/stats/clients', async (req, res) => {
  const keys = await redis.keys('client:*');
  const clientIds = keys.map(k => k.split(':')[1]);
  res.json(clientIds);
});

app.get('/stats/data', async (req, res) => {
  const clientId = req.query.clientId;
  const threshold = Date.now() - 30 * 60 * 1000;
  const entries = await redis.zrangebyscore(`client:${clientId}`, threshold, '+inf');
  const data = entries.map(e => JSON.parse(e));
  res.json(data);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: `${Math.floor((Date.now() - startTime) / 1000)} seconds`,
    clientsConnected: 'N/A (simulated pub/sub)'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));