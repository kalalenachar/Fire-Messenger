// Agni Messenger - Standalone Clean Database Reset Script
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load .env if present
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  });
}

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agni";

const adminUser = {
  _id: "user_admin_root",
  name: "Administrator",
  username: "admin",
  email: "admin@agnimessenger.io",
  password: "admin123",
  isAdmin: true,
  pic: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  status: "🔥 Agni Administrator",
  isVerified: true,
  verificationStatus: "verified",
  verificationType: "business",
};

const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Agni Bot 🔥",
  username: "agni_bot",
  email: "bot@agnimessenger.io",
  password: "bot_system_protected_no_login",
  pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  status: "Official Automated Assistant | Online 24/7",
  isVerified: true,
  verificationStatus: "verified",
  verificationType: "business",
  isBot: true,
};

async function resetDb() {
  console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB!");

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Clearing demo and existing records...`);

    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
      console.log(`✓ Cleared collection: ${col.name}`);
    }

    // Insert clean Admin and Bot
    await mongoose.connection.db.collection("users").insertMany([adminUser, fireBotUser]);
    console.log("\n=======================================================");
    console.log("🎉 DATABASE RESET SUCCESSFUL!");
    console.log("=======================================================");
    console.log("👑 Official Admin Credentials:");
    console.log("   • Username: admin");
    console.log("   • Email:    admin@agnimessenger.io");
    console.log("   • Password: admin123");
    console.log("   • Role:     Administrator (Full Access)");
    console.log("=======================================================");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset Error:", error.message);
    process.exit(1);
  }
}

resetDb();
