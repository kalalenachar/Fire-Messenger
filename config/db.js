const mongoose = require("mongoose");
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
  {
    _id: "user_sarah",
    name: "Sarah Jenkins",
    email: "sarah@agnimessenger.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "Designing the future ✨ | Online",
    token: "token_sarah_12345",
    isVerified: false,
    verificationStatus: "none",
  },
  {
    _id: "user_marcus",
    name: "Marcus Vance",
    email: "marcus@agnimessenger.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "Coding late night 💻",
    token: "token_marcus_12345",
    isVerified: false,
    verificationStatus: "none",
  },
  {
    _id: "user_elena",
    name: "Elena Rostova",
    email: "elena@agnimessenger.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    status: "Building real-time apps 🚀",
    token: "token_elena_12345",
    isVerified: false,
    verificationStatus: "none",
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
  {
    _id: "chat_fire_squad",
    chatName: "Agni Squad 🔥 Core Team",
    isGroupChat: true,
    groupAdmin: defaultUsersList[0],
    users: [defaultUsersList[0], defaultUsersList[1], defaultUsersList[2]],
    latestMessage: {
      content: "Welcome to the team! Real-time messaging is live 🔥",
      sender: defaultUsersList[1],
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    unread: 2,
    pinned: true,
    category: "Groups",
  },
  {
    _id: `chat_sarah_${defaultUsersList[0]._id}`,
    chatName: "Sarah Jenkins",
    isGroupChat: false,
    users: [defaultUsersList[0], defaultUsersList[1]],
    latestMessage: {
      content: "Hey! Ready to test real-time chat?",
      sender: defaultUsersList[1],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    unread: 0,
    pinned: false,
    category: "Personal",
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
  {
    _id: "msg_squad_1",
    sender: defaultUsersList[2],
    content: "Hey team! Agni Messenger MongoDB production server is officially live!",
    chat: "chat_fire_squad",
    createdAt: new Date(Date.now() - 1800000),
    reactions: { "🚀": 3 },
  },
  {
    _id: "msg_squad_2",
    sender: defaultUsersList[1],
    content: "Welcome to the team! Real-time messaging is live 🔥",
    chat: "chat_fire_squad",
    createdAt: new Date(Date.now() - 300000),
    reactions: { "❤️": 2, "🔥": 4 },
  },
];

let isConnected = false;

async function connectDb() {
  if (isConnected) return;
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    await seedDatabaseIfEmpty();
    await ensureAdminPrivileges();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
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
