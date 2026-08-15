import mongoose from 'mongoose';

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

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  console.log('[db] MongoDB connected');
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
