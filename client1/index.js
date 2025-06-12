// ==== client1.js (Top CPU Processes) ====
import os from 'os';
import psList from 'ps-list';
import Redis from 'ioredis';

const redis = new Redis();
const CLIENT_ID = `client1-${Math.random().toString(36).substring(7)}`;

async function publishTopProcesses() {
  const processes = await psList();
  const topProcesses = processes
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 10)
    .map(proc => ({ pid: proc.pid, cpu: proc.cpu, memory: proc.memory }));

  await redis.publish('stats-channel', JSON.stringify({
    clientId: CLIENT_ID,
    type: 'TOP',
    timestamp: Date.now(),
    data: topProcesses
  }));
}

setInterval(publishTopProcesses, 3000);