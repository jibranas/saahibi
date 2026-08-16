import mongoose from 'mongoose';

/**
 * Serverless invocations reuse a warm process, so the connection is cached on
 * `globalThis` rather than a module local — module state can be discarded
 * independently of the process, and reconnecting per request would exhaust
 * the Atlas connection pool.
 */
const cache = (globalThis.__saahibiMongo ??= { promise: null });

/**
 * Connects to MongoDB Atlas when MONGODB_URI is set.
 * If unset, the API still starts (add your URI in .env when ready).
 */
export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri?.trim()) {
    console.warn(
      '[db] MONGODB_URI is not set — skipping MongoDB. Add it to .env when ready.'
    );
    return;
  }

  if (isDbConnected()) return;

  if (!cache.promise) {
    mongoose.set('strictQuery', true);

    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .then((conn) => {
        console.log('[db] MongoDB connected');
        return conn;
      })
      .catch((err) => {
        // Clear the cache so the next request retries instead of resolving
        // against a permanently rejected promise.
        cache.promise = null;
        throw err;
      });
  }

  await cache.promise;
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
