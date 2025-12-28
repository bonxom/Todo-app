import mongoose from "mongoose";

const DB_URI = process.env.MONGO_URI
const DB_NAME = process.env.MONGO_NAME

if (!DB_URI){
    throw new Error("Missing MONGO_URI at .env file");
}

export const connectDB = async () => {
    try {
        await mongoose.connect(DB_URI, {
            dbName: DB_NAME
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

