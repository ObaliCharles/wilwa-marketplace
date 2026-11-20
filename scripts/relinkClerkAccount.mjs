import connectDB from "../config/db.js";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { chmod, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const [oldId, newId, email, mode] = process.argv.slice(2);

if (!oldId || !newId || !email || !["--dry-run", "--apply"].includes(mode)) {
  console.error("Usage: node scripts/relinkClerkAccount.mjs <oldId> <newId> <email> --dry-run|--apply");
  process.exit(2);
}

const referenceSpecs = {
  users: ["messages.from", "messages.to", "storeFollowerIds", "followedStores"],
  orders: ["userId", "sellerId", "riderId", "sellerReview.reviewerId"],
  products: ["userId", "likedBy", "reviews.userId"],
  addresses: ["userId"],
  savedsearches: ["userId"],
  savedsearchnotifications: ["userId"],
  billinginvoices: ["sellerId", "generatedBy"],
  vendorapplications: ["submittedByUserId"],
  auditlogs: ["actorId", "targetId"],
  banners: ["createdBy"],
};

const filterFor = (fields) => ({ $or: fields.map((field) => ({ [field]: oldId })) });
const makeProjection = (fields) => Object.fromEntries(fields.map((field) => [field, 1]));
const referenceSummary = {};

await connectDB();
const db = mongoose.connection.db;
const users = db.collection("users");
const oldUser = await users.findOne({ _id: oldId });

if (!oldUser) throw new Error("Old MongoDB account was not found; no changes made.");
if (String(oldUser.email || "").toLowerCase() !== email.toLowerCase()) {
  throw new Error("Old MongoDB account email did not match; no changes made.");
}
if (await users.findOne({ _id: newId })) {
  throw new Error("New Clerk ID already exists in MongoDB; no changes made.");
}

const snapshot = { createdAt: new Date().toISOString(), database: db.databaseName, oldId, newId, collections: {} };
snapshot.collections.users = await users.find(filterFor(["_id", ...referenceSpecs.users])).toArray();
for (const [collectionName, fields] of Object.entries(referenceSpecs)) {
  if (collectionName === "users") continue;
  const collection = db.collection(collectionName);
  snapshot.collections[collectionName] = await collection.find(filterFor(fields)).toArray();
  referenceSummary[collectionName] = snapshot.collections[collectionName].length;
}
referenceSummary.users = snapshot.collections.users.length;

const backupPath = `/tmp/wilwa-account-relink-${Date.now()}.ejson`;
await writeFile(backupPath, EJSON.stringify(snapshot, { relaxed: false }), { mode: 0o600, flag: "wx" });
await chmod(backupPath, 0o600);

if (mode === "--dry-run") {
  console.log(JSON.stringify({ dryRun: true, database: db.databaseName, emailMatched: true, oldId, newId, referenceDocuments: referenceSummary, backupPath }));
  await mongoose.disconnect();
  process.exit(0);
}

const session = await mongoose.startSession();
const temporaryEmail = `migration-${randomUUID()}@invalid.invalid`;

try {
  session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });

  const currentOldUser = await users.findOne({ _id: oldId }, { session });
  if (!currentOldUser || String(currentOldUser.email || "").toLowerCase() !== email.toLowerCase()) {
    throw new Error("Old account changed after inspection; migration aborted.");
  }
  if (await users.findOne({ _id: newId }, { session })) {
    throw new Error("New Clerk ID now exists; migration aborted.");
  }

  const claimedEmail = await users.updateOne({ _id: oldId, email: currentOldUser.email }, { $set: { email: temporaryEmail } }, { session });
  if (claimedEmail.modifiedCount !== 1) throw new Error("Could not reserve the existing email; migration aborted.");
  await users.insertOne({ ...currentOldUser, _id: newId, email: currentOldUser.email }, { session });

  const moveField = async (collectionName, field) =>
    db.collection(collectionName).updateMany({ [field]: oldId }, { $set: { [field]: newId } }, { session });
  const moveArrayField = async (collectionName, field, arrayName) =>
    db.collection(collectionName).updateMany({ [field]: oldId }, { $set: { [`${arrayName}.$[entry]`]: newId } }, { session, arrayFilters: [{ entry: oldId }] });

  for (const field of ["userId", "sellerId", "riderId", "sellerReview.reviewerId"]) await moveField("orders", field);
  await moveField("products", "userId");
  await moveArrayField("products", "likedBy", "likedBy");
  await db.collection("products").updateMany({ "reviews.userId": oldId }, { $set: { "reviews.$[review].userId": newId } }, { session, arrayFilters: [{ "review.userId": oldId }] });
  for (const collectionName of ["addresses", "savedsearches", "savedsearchnotifications"]) await moveField(collectionName, "userId");
  for (const field of ["sellerId", "generatedBy"]) await moveField("billinginvoices", field);
  await moveField("vendorapplications", "submittedByUserId");
  for (const field of ["actorId", "targetId"]) await moveField("auditlogs", field);
  await moveField("banners", "createdBy");
  for (const field of ["messages.from", "messages.to"]) {
    const key = field.endsWith(".from") ? "from" : "to";
    await users.updateMany({ [field]: oldId }, { $set: { [`messages.$[message].${key}`]: newId } }, { session, arrayFilters: [{ [`message.${key}`]: oldId }] });
  }
  for (const field of ["storeFollowerIds", "followedStores"]) await moveArrayField("users", field, field);

  const deletedOldUser = await users.deleteOne({ _id: oldId, email: temporaryEmail }, { session });
  if (deletedOldUser.deletedCount !== 1) throw new Error("Could not remove the superseded user row; migration aborted.");

  for (const [collectionName, fields] of Object.entries(referenceSpecs)) {
    const remaining = await db.collection(collectionName).countDocuments(filterFor(fields), { session, limit: 1 });
    if (remaining) throw new Error(`Old ID references remain in ${collectionName}; migration aborted.`);
  }
  const migratedUser = await users.findOne({ _id: newId, email }, { session, projection: { _id: 1 } });
  if (!migratedUser) throw new Error("New user verification failed; migration aborted.");

  await session.commitTransaction();
  console.log(JSON.stringify({ applied: true, database: db.databaseName, oldId, newId, referenceDocuments: referenceSummary, backupPath }));
} catch (error) {
  if (session.inTransaction()) await session.abortTransaction();
  console.error(`Account relink rolled back: ${error.message}. Private snapshot: ${backupPath}`);
  process.exitCode = 1;
} finally {
  await session.endSession();
  await mongoose.disconnect();
}
