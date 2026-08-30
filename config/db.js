const mongoose = require("mongoose");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agni";

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
  verificationDetails: {
    gstinMasked: "27AAACB2418Q1Z1",
    businessName: "Agni Messenger Inc.",
    verifiedAt: "2026-08-01T12:00:00Z",
  },
  isBot: true,
};

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

const defaultUsersList = [adminUser];
const initialChats = [];
const initialMessages = [];

const net = require("net");
const { seedInMemoryStore } = require("../services/memoryDb");

let isConnected = false;

function checkMongoPort(uri) {
  return new Promise((resolve) => {
    let host = "127.0.0.1";
    let port = 27017;
    try {
      const match = uri.match(/mongodb:\/\/(?:.*@)?([^:/]+)(?::(\d+))?/);
      if (match) {
        host = match[1] || "127.0.0.1";
        port = parseInt(match[2] || "27017", 10);
      }
    } catch (e) {}

    const socket = net.createConnection({ host, port, timeout: 1000 }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function connectDb() {
  if (isConnected) return;
  const isPortOpen = await checkMongoPort(MONGO_URI);
  if (isPortOpen) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 2000,
      });
      isConnected = true;
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      await ensureUserIndexes();
      await seedDatabaseIfEmpty();
      await ensureAdminPrivileges();
      return;
    } catch (err) {
      console.warn(`⚠️ MongoDB connection error (${err.message}). Activating In-Memory Fallback...`);
    }
  } else {
    console.warn(`⚠️ Local MongoDB port (27017) not active. Activating instant In-Memory Data Engine fallback...`);
  }

  seedInMemoryStore(defaultUsersList, initialChats, initialMessages, fireBotUser);
}

async function seedDatabaseIfEmpty() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("🌱 Seeding initial Agni Messenger users and chats into MongoDB...");
      await User.insertMany(defaultUsersList);
      await Chat.insertMany(initialChats);
      await Message.insertMany(initialMessages);
      console.log("✅ Initial seed data written to MongoDB.");
    }
  } catch (err) {
    console.error("Error seeding MongoDB:", err);
  }
}

async function ensureAdminPrivileges() {
  try {
    const existingBot = await User.findById(fireBotUser._id);
    if (!existingBot) {
      await User.create(fireBotUser);
    }
    // Upsert or update official Admin user
    const existingAdmin = await User.findOne({
      $or: [{ username: "admin" }, { email: "admin@agnimessenger.io" }],
    });
    if (!existingAdmin) {
      await User.create(adminUser);
      console.log("👑 Admin user created (username: admin, password: admin123)");
    } else {
      existingAdmin.username = "admin";
      existingAdmin.password = "admin123";
      existingAdmin.isAdmin = true;
      existingAdmin.isVerified = true;
      existingAdmin.verificationStatus = "verified";
      await existingAdmin.save();
    }

    const adminEmails = [
      "admin@agnimessenger.io",
      "kalalenachar@gmail.com",
    ];
    await User.updateMany(
      { email: { $in: adminEmails } },
      { $set: { isAdmin: true } }
    );

    // Cleanup legacy dummy users and chats from database
    const dummyEmails = [
      "alex@agnimessenger.io",
      "alex@agni.io",
      "sarah@agnimessenger.io",
      "marcus@agnimessenger.io",
      "elena@agnimessenger.io",
    ];
    await User.deleteMany({ email: { $in: dummyEmails } });
    await Chat.deleteMany({ _id: { $in: ["chat_fire_squad", "chat_sarah", "chat_tech_lounge", "chat_fire_bot"] } });
    await Message.deleteMany({ chat: { $in: ["chat_fire_squad", "chat_sarah", "chat_tech_lounge", "chat_fire_bot"] } });
  } catch (err) {
    console.error("Error ensuring admin privileges:", err);
  }
}

async function ensureUserIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const collections = await db.listCollections({ name: "users" }).toArray();
    if (collections.length > 0) {
      const usersCol = db.collection("users");
      const indexes = await usersCol.indexes();

      // Unset duplicate null keys so sparse index ignores them
      await usersCol.updateMany({ email: null }, { $unset: { email: "" } });
      await usersCol.updateMany({ username: null }, { $unset: { username: "" } });

      // Drop non-sparse legacy unique indexes if present
      for (const idx of indexes) {
        if (idx.name === "email_1" && !idx.sparse) {
          console.log("Dropping non-sparse email_1 index...");
          await usersCol.dropIndex("email_1").catch(() => {});
        }
        if (idx.name === "username_1" && !idx.sparse) {
          console.log("Dropping non-sparse username_1 index...");
          await usersCol.dropIndex("username_1").catch(() => {});
        }
      }

      // Recreate sparse unique indexes
      await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true, background: true });
      await usersCol.createIndex({ username: 1 }, { unique: true, sparse: true, background: true });
    }
  } catch (err) {
    console.warn("Index check note:", err.message);
  }
}

module.exports = {
  connectDb,
  fireBotUser,
  defaultUsersList,
  initialChats,
  initialMessages,
};
