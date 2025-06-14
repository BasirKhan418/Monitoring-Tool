import Redis from 'ioredis';


const redis = new Redis(process.env.REDIS_URL); // or use your full URI directly

async function flushData() {
  try {
    const keys = await redis.keys('client:*');
    if (keys.length) {
      await redis.del(keys);
      console.log(`✅ Deleted ${keys.length} keys matching client:*`);
    } else {
      console.log(`ℹ️ No client:* keys found.`);
    }
    redis.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

flushData();
