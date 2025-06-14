import express from 'express';
import Redis from 'ioredis';
import path from 'path';
import amqp from 'amqplib';
import { fileURLToPath } from 'url';

const app = express();
const redis = new Redis(process.env.REDIS_URL);

// const subscriber = new Redis(process.env.REDIS_URL);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startTime = Date.now();
const EXCHANGE = 'process-data';
const RESPONSE_EXCHANGE = 'client-response';
//prev fanout implemantation using redis
// // Redis subscription
// subscriber.subscribe('stats-channel');
// subscriber.on('message', async (channel, message) => {
//   const parsed = JSON.parse(message);
 
//   const { clientId, data, timestamp } = parsed;
 
//   const key = `client:${clientId}`;
  
//   // Store each record in a sorted set with timestamp
//   await redis.zadd(key, timestamp, JSON.stringify({ timestamp, data }));

//   // Remove old data older than 30 minutes
//   const threshold = Date.now() - 30 * 60 * 1000;
//   await redis.zremrangebyscore(key, 0, threshold);
// });


//new implementation using RabbitMQ

async function startRabbitConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'fanout', { durable: false });
  await channel.assertExchange(RESPONSE_EXCHANGE, 'direct', { durable: false });

  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE, '');

  channel.consume(q.queue, async (msg) => {
    if (!msg.content) return;
    const parsed = JSON.parse(msg.content.toString());
    const { clientId, data, timestamp } = parsed;
    const key = `client:${clientId}`;
    const threshold = Date.now() - 30 * 60 * 1000;

    await redis.zadd(key, timestamp, JSON.stringify({ timestamp, data }));
    await redis.zremrangebyscore(key, 0, threshold);

     const queueName= `response.${clientId}`;
        await channel.assertQueue(queueName, {
        exclusive: false,
        durable: false,
        autoDelete: true,
        arguments: {
          'x-expires': 300000 
        }
      });
    
      await channel.bindQueue(queueName, RESPONSE_EXCHANGE, clientId);
    
      channel.consume(queueName, (msg) => {
        if (msg) {
          const res = JSON.parse(msg.content.toString());
          console.log(`Response for ${clientId}:`, res.message);
        }
      }, { noAck: true });
  
  }, { noAck: true });
}

startRabbitConsumer();

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