const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agni";

const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Agni Bot 🔥",
  email: "bot@agnimessenger.io",
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
};

const defaultUsersList = [
  {
    _id: "user_agni_01",
    name: "Alex Rivers",
    email: "alex@agnimessenger.io",
    password: "123",
    isAdmin: true,
    pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "Available | 🔥 Burning with Passion",
    token: "token_alex_12345",
    isVerified: true,
    verificationStatus: "verified",
    verificationType: "individual",
    verificationDetails: {
      aadhaarMasked: "XXXX-XXXX-4812",
      verifiedAt: "2026-08-20T10:00:00Z",
      matchScore: 98.4,
    },
  },
];

const initialChats = [
  {
    _id: "chat_fire_bot",
    chatName: "Agni Bot 🔥",
    isGroupChat: false,
    users: [defaultUsersList[0], fireBotUser],
    latestMessage: {
      content: "Welcome to Agni Messenger! Send a message or command like /help",
      sender: fireBotUser,
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
    unread: 1,
    pinned: true,
    category: "Bots",
  },
];

const initialMessages = [
  {
    _id: "msg_bot_1",
    sender: fireBotUser,
    content: "Greetings! Welcome to **Agni Messenger 🔥**.",
    chat: "chat_fire_bot",
    createdAt: new Date(Date.now() - 360000),
    reactions: { "🔥": 2 },
  },
  {
    _id: "msg_bot_2",
    sender: fireBotUser,
    content: "I am your automated AI assistant. Try commands like `/help`, `/fire`, `/joke`, `/weather`, or `/time`!",
    chat: "chat_fire_bot",
    createdAt: new Date(Date.now() - 60000),
    reactions: { "👍": 1 },
  },
];

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
    const adminEmails = [
      "kalalenachar@gmail.com",
      "alex@agnimessenger.io",
      "alex@agni.io",
    ];
    await User.updateMany(
      { email: { $in: adminEmails } },
      { $set: { isAdmin: true } }
    );
    // Cleanup any legacy dummy users and chats from database
    const dummyEmails = [
      "sarah@agnimessenger.io",
      "marcus@agnimessenger.io",
      "elena@agnimessenger.io",
    ];
    await User.deleteMany({ email: { $in: dummyEmails } });
    await Chat.deleteMany({ _id: { $in: ["chat_fire_squad", "chat_sarah", "chat_tech_lounge"] } });
    await Message.deleteMany({ chat: { $in: ["chat_fire_squad", "chat_sarah", "chat_tech_lounge"] } });
  } catch (err) {
    console.error("Error ensuring admin privileges:", err);
  }
}

module.exports = {
  connectDb,
  fireBotUser,
  defaultUsersList,
  initialChats,
  initialMessages,
};
