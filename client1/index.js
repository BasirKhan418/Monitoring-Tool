
import psList from 'ps-list';
import amqp  from 'amqplib';
// import Redis from 'ioredis';

// const redis = new Redis(process.env.REDIS_URL);
const CLIENT_ID = `client1-${Math.random().toString(36).substring(7)}`;
const EXCHANGE = 'process-data';
//NEW CODE IMPLEMENTATION USING RABITMQ
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'fanout', { durable: false });

async function publishTopProcesses() {
  const processes = await psList();
  const topProcesses = processes
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 10)
    .map(proc => ({ pid: proc.pid, cpu: proc.cpu, memory: proc.memory }));
    //PREV CODE

  // await redis.publish('stats-channel', JSON.stringify({
  //   clientId: CLIENT_ID,
  //   type: 'TOP',
  //   timestamp: Date.now(),
  //   data: topProcesses
  // }));
  //NEW CODE IMPLEMENTATION USING RABITMQ
  channel.publish(EXCHANGE, '', Buffer.from(JSON.stringify({
    clientId: CLIENT_ID,
    type: 'TOP',
    timestamp: Date.now(),
    data: topProcesses
  })));
}

setInterval(publishTopProcesses, 3000);