/**
 * One-time migration script: flatten existing Candidate documents
 *
 * Before running:
 *   1. Make sure MongoDB is accessible (check .env for MONGO_URI)
 *   2. Back up your database if you have important data
 *
 * Run with:
 *   node migrate-candidates.js
 *
 * What it does:
 *   - Moves personal_info.{name,email,phone,...} → top-level fields
 *   - Moves skills.skills → skills (flat array)
 *   - Copies User.phone and User.linkedin into Candidate if missing
 *   - Removes the old nested personal_info and skills objects
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

async function migrate() {
  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected\n");

  const db = mongoose.connection.db;
  const candidatesCol = db.collection("candidates");
  const usersCol = db.collection("users");

  const candidates = await candidatesCol.find({}).toArray();
  console.log(`📋 Found ${candidates.length} candidate documents to check\n`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of candidates) {
    const hasNestedPersonalInfo = doc.personal_info && typeof doc.personal_info === "object";
    const hasNestedSkills = doc.skills && !Array.isArray(doc.skills) && typeof doc.skills === "object";

    if (!hasNestedPersonalInfo && !hasNestedSkills) {
      skipped++;
      continue;
    }

    const pi = doc.personal_info || {};
    const rawSkills = doc.skills || {};

    // Try to get supplementary data from the linked User
    let userDoc = null;
    if (doc.user) {
      userDoc = await usersCol.findOne({ _id: doc.user });
    }

    const flatFields = {
      name: pi.name || userDoc?.name || doc.name || "Unknown",
      email: pi.email || userDoc?.email || doc.email || "",
      phone: pi.phone || userDoc?.phone || doc.phone || "",
      location: pi.location || doc.location || "",
      github: pi.github || doc.github || "",
      linkedin: pi.linkedin || userDoc?.linkedin || doc.linkedin || "",
      summary: pi.summary || doc.summary || "",
      title: doc.title || "",
      skills: hasNestedSkills ? (rawSkills.skills || []) : (doc.skills || []),
    };

    await candidatesCol.updateOne(
      { _id: doc._id },
      {
        $set: flatFields,
        $unset: { personal_info: "", "skills.skills": "", "skills.confidence_score": "" },
      },
    );

    console.log(`  ✅ Migrated: ${flatFields.name} (${flatFields.email || "no email"})`);
    migrated++;
  }

  // Also clean up User documents — remove phone, linkedin, avatar fields
  // These are now canonical in Candidate/Company only
  const userResult = await usersCol.updateMany(
    {},
    { $unset: { phone: "", linkedin: "", avatar: "" } },
  );
  console.log(`\n🧹 Cleaned ${userResult.modifiedCount} user documents (removed phone/linkedin/avatar)`);

  console.log(`\n────────────────────────────`);
  console.log(`✅ Migration complete`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped (already flat): ${skipped}`);
  console.log(`   Total: ${candidates.length}`);

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
