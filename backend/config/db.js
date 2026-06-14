import mongoose from "mongoose";

let connectionPromise;

export const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        const { MONGO_URI, MONGO_NAME } = process.env;

        if (!MONGO_URI) {
            throw new Error("Missing required environment variable: MONGO_URI");
        }

        connectionPromise = mongoose
            .connect(MONGO_URI, {
                dbName: MONGO_NAME || undefined,
            })
            .then((connection) => {
                console.log("Connected to MongoDB");
                return connection.connection;
            })
            .catch((error) => {
                connectionPromise = undefined;
                throw error;
            });
    }

    return connectionPromise;
};
