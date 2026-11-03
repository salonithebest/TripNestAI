import mongoose from "mongoose";
import { env } from "./env";
import { User } from "../models/User";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);

  const usersCollection = mongoose.connection.collection("users");
  const indexes = await usersCollection.indexes();
  const obsoleteUsernameIndex = indexes.find(
    (index) => index.name === "username_1" && "username" in index.key,
  );
  if (obsoleteUsernameIndex?.name) {
    await usersCollection.dropIndex(obsoleteUsernameIndex.name);
  }
  await User.createIndexes();

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
