import mongoose from "mongoose";
import { env } from "./env";
import { User } from "../models/User";
import { JourneySegment } from "../models/JourneySegment";

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
  await removeDuplicateTrainLegs();
  await JourneySegment.createIndexes();

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

async function removeDuplicateTrainLegs(): Promise<void> {
  const duplicateGroups = await JourneySegment.aggregate<{
    _id: { tripId: mongoose.Types.ObjectId; pnr: string; departure: Date };
    ids: mongoose.Types.ObjectId[];
  }>([
    {
      $match: {
        transportMode: "train",
        pnr: { $type: "string" },
        departure: { $type: "date" },
      },
    },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: { tripId: "$tripId", pnr: "$pnr", departure: "$departure" },
        ids: { $push: "$_id" },
      },
    },
    { $match: { "ids.1": { $exists: true } } },
  ]);
  let removed = 0;
  for (const group of duplicateGroups) {
    const result = await JourneySegment.deleteMany({ _id: { $in: group.ids.slice(1) } });
    removed += result.deletedCount;
  }
  console.log(`Removed ${removed} duplicate train leg(s).`);
}
