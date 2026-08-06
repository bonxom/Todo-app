import mongoose from 'mongoose';

let connectionPromise: Promise<mongoose.Connection> | undefined;

export const connectDB = async (): Promise<mongoose.Connection> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    const { MONGO_URI, MONGO_NAME } = process.env;

    if (!MONGO_URI) {
      throw new Error('Missing required environment variable: MONGO_URI');
    }

    connectionPromise = mongoose
      .connect(MONGO_URI, { dbName: MONGO_NAME || undefined })
      .then((connection) => {
        console.log('Connected to MongoDB');
        return connection.connection;
      })
      .catch((error: unknown) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
};
