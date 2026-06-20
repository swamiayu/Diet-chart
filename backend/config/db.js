import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Copy .env.example to .env and add your MongoDB Atlas connection string."
    );
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      // Mongoose 8 uses sane defaults; these are explicit for clarity.
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    throw err;
  }

  mongoose.connection.on("disconnected", () => console.warn("⚠️  MongoDB disconnected"));
  mongoose.connection.on("error", (e) => console.error("MongoDB error:", e.message));
}
