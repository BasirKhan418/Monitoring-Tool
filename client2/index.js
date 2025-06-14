
import psList from 'ps-list';
import amqp  from 'amqplib';
// import Redis from 'ioredis';

// const redis = new Redis(process.env.REDIS_URL);
const CLIENT_ID = `client2-${Math.random().toString(36).substring(7)}`;
//NEW CODE IMPLEMENTATION USING RABITMQ
const EXCHANGE = 'process-data';
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'fanout', { durable: false });

async function publishBottomProcesses() {
  const processes = await psList();
  const bottomProcesses = processes
    .slice(0,10)
    .sort((a, b) =>  b.memory- a.memory)
    .map(proc => ({ pid: proc.pid, cpu: proc.cpu, memory: proc.memory }));

  // await redis.publish('stats-channel', JSON.stringify({
  //   clientId: CLIENT_ID,
  //   type: 'BOTTOM',
  //   timestamp: Date.now(),
  //   data: bottomProcesses
  // }));

  //NEW CODE IMPLEMENTATION USING RABITMQ
  channel.publish(EXCHANGE, '', Buffer.from(JSON.stringify({
    clientId: CLIENT_ID,
    type: 'BOTTOM',
    timestamp: Date.now(),
    data: bottomProcesses
  })));
}

setInterval(publishBottomProcesses, 3000);