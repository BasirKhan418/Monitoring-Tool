import os from 'os';
import psList from 'ps-list';
import Redis from 'ioredis';

const redis = new Redis();
const CLIENT_ID = `client2-${Math.random().toString(36).substring(7)}`;

async function publishBottomProcesses() {
  const processes = await psList();
  const bottomProcesses = processes
    .sort((a, b) => a.cpu - b.cpu)
    .slice(0, 10)
    .map(proc => ({ pid: proc.pid, cpu: proc.cpu, memory: proc.memory }));

  await redis.publish('stats-channel', JSON.stringify({
    clientId: CLIENT_ID,
    type: 'BOTTOM',
    timestamp: Date.now(),
    data: bottomProcesses
  }));
}

setInterval(publishBottomProcesses, 3000);