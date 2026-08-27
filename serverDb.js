const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "db.json");

const defaultUsersList = [
  {
    _id: "user_fire_01",
    name: "Alex Rivers",
    email: "alex@firemessenger.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "Available | 🔥 Burning with Passion",
    token: "token_alex_12345",
  },
  {
    _id: "user_sarah",
    name: "Sarah Jenkins",
    email: "sarah@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "Designing the future ✨ | Online",
    token: "token_sarah_12345",
  },
  {
    _id: "user_marcus",
    name: "Marcus Vance",
    email: "marcus@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "Coding late night 💻",
    token: "token_marcus_12345",
  },
  {
    _id: "user_elena",
    name: "Elena Rostova",
    email: "elena@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    status: "Building real-time apps 🚀",
    token: "token_elena_12345",
  },
];

const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Fire Bot 🔥",
  email: "bot@firemessenger.io",
  pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  status: "Official Automated Assistant | Online 24/7",
};

const initialChats = [
  {
    _id: "chat_fire_bot",
    chatName: "Fire Bot 🔥",
    isGroupChat: false,
    users: [defaultUsersList[0], fireBotUser],
    latestMessage: {
      content: "Welcome to Fire Messenger! Send a message or command like /help",
      sender: fireBotUser,
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
    unread: 1,
    pinned: true,
    category: "Bots",
  },
  {
    _id: "chat_fire_squad",
    chatName: "Fire Squad 🔥 Core Team",
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

const initialMessages = {
  chat_fire_bot: [
    {
      _id: "msg_bot_1",
      sender: fireBotUser,
      content: "Greetings! Welcome to **Fire Messenger 🔥**.",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 360000).toISOString(),
      reactions: { "🔥": 2 },
    },
    {
      _id: "msg_bot_2",
      sender: fireBotUser,
      content: "I am your automated AI assistant. Try commands like `/help`, `/fire`, `/joke`, `/weather`, or `/time`!",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 60000).toISOString(),
      reactions: { "👍": 1 },
    },
  ],
  chat_fire_squad: [
    {
      _id: "msg_squad_1",
      sender: defaultUsersList[2],
      content: "Hey team! Fire Messenger persistent server DB is officially online!",
      chat: "chat_fire_squad",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      reactions: { "🚀": 3 },
    },
    {
      _id: "msg_squad_2",
      sender: defaultUsersList[1],
      content: "Welcome to the team! Real-time messaging is live 🔥",
      chat: "chat_fire_squad",
      createdAt: new Date(Date.now() - 300000).toISOString(),
      reactions: { "❤️": 2, "🔥": 4 },
    },
  ],
};

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: defaultUsersList,
      chats: initialChats,
      messages: initialMessages,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading db.json, reinitializing...", err);
    const initialData = {
      users: defaultUsersList,
      chats: initialChats,
      messages: initialMessages,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// User methods
function loginUser(email, password) {
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) throw new Error("No account found with this email address.");
  if (user.password !== password) throw new Error("Invalid password. Please check your credentials.");
  const { password: _, ...cleanUser } = user;
  return cleanUser;
}

function registerUser({ name, email, password, pic, status }) {
  const db = readDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) throw new Error("An account with this email address already exists.");

  const newUser = {
    _id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    pic: pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    status: status || "Available | 🔥 Fire Messenger",
    token: `token_${Date.now()}`,
  };

  db.users.push(newUser);

  // Auto create bot chat and squad chat for new user
  const userBotChat = {
    _id: `chat_bot_${newUser._id}`,
    chatName: "Fire Bot 🔥",
    isGroupChat: false,
    users: [newUser, fireBotUser],
    latestMessage: {
      content: "Welcome to Fire Messenger! Send a message or command like /help",
      sender: fireBotUser,
      createdAt: new Date().toISOString(),
    },
    unread: 1,
    pinned: true,
    category: "Bots",
  };

  db.chats.unshift(userBotChat);
  db.messages[userBotChat._id] = [
    {
      _id: `msg_bot_${Date.now()}`,
      sender: fireBotUser,
      content: `Greetings ${newUser.name}! Welcome to **Fire Messenger 🔥**. I am your automated AI assistant.`,
      chat: userBotChat._id,
      createdAt: new Date().toISOString(),
      reactions: { "🔥": 1 },
    },
  ];

  writeDb(db);

  const { password: _, ...cleanUser } = newUser;
  return cleanUser;
}

function updateUserProfile(userId, updates) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...updates };
    // Also update users array in existing chats
    db.chats = db.chats.map((c) => ({
      ...c,
      users: c.users.map((u) => (u._id === userId ? { ...u, ...updates } : u)),
    }));
    writeDb(db);
    const { password: _, ...cleanUser } = db.users[index];
    return cleanUser;
  }
  return null;
}

function searchUsers(query, currentUserId) {
  const db = readDb();
  const q = query.toLowerCase().trim();
  return db.users
    .filter((u) => u._id !== currentUserId && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
    .map(({ password, ...clean }) => clean);
}

// Chat methods
function getUserChats(userId) {
  const db = readDb();
  const userMap = new Map(db.users.map((u) => [u._id, u]));
  if (fireBotUser) userMap.set(fireBotUser._id, fireBotUser);

  return db.chats
    .filter((c) => c.users && c.users.some((u) => u._id === userId))
    .map((c) => ({
      ...c,
      users: c.users.map((u) => {
        const fullUser = userMap.get(u._id);
        if (fullUser) {
          const { password, ...clean } = fullUser;
          return { ...clean, ...u, pic: fullUser.pic || u.pic, name: fullUser.name || u.name, status: fullUser.status || u.status };
        }
        return u;
      }),
      latestMessage: c.latestMessage?.sender?._id && userMap.get(c.latestMessage.sender._id)
        ? {
            ...c.latestMessage,
            sender: (() => {
              const full = userMap.get(c.latestMessage.sender._id);
              const { password, ...clean } = full;
              return { ...clean, ...c.latestMessage.sender, pic: full.pic || c.latestMessage.sender.pic };
            })(),
          }
        : c.latestMessage,
    }));
}

function saveChat(chat) {
  const db = readDb();
  const existingIndex = db.chats.findIndex((c) => c._id === chat._id);
  if (existingIndex !== -1) {
    db.chats[existingIndex] = chat;
  } else {
    db.chats.unshift(chat);
  }
  writeDb(db);
  return chat;
}

function createGroupChat({ chatName, users, groupAdmin }) {
  const db = readDb();
  const newChat = {
    _id: `group_${Date.now()}`,
    chatName,
    isGroupChat: true,
    groupAdmin,
    users,
    latestMessage: {
      content: `Group "${chatName}" created`,
      sender: groupAdmin,
      createdAt: new Date().toISOString(),
    },
    unread: 0,
    pinned: false,
    category: "Groups",
  };

  db.chats.unshift(newChat);
  writeDb(db);
  return newChat;
}

// Message methods
function getChatMessages(chatId) {
  const db = readDb();
  return db.messages[chatId] || [];
}

function addMessage(message) {
  const db = readDb();
  const chatId = message.chatObj?._id || (typeof message.chat === "object" ? message.chat?._id : message.chat);
  if (!chatId) return message;

  if (!db.messages[chatId]) {
    db.messages[chatId] = [];
  }

  const existingIndex = db.messages[chatId].findIndex((m) => m._id === message._id);
  if (existingIndex === -1) {
    db.messages[chatId].push(message);
  } else {
    db.messages[chatId][existingIndex] = message;
  }

  // Update latest message in chat
  const chatIndex = db.chats.findIndex((c) => c._id === chatId);
  if (chatIndex !== -1) {
    db.chats[chatIndex].latestMessage = {
      content: message.type === "voice" ? "🎤 Voice Note" : message.type === "image" ? "📷 Photo" : message.type === "file" ? `📄 ${message.content}` : message.content,
      sender: message.sender,
      createdAt: message.createdAt,
    };
  }

  writeDb(db);
  return message;
}

function toggleMessageReaction({ chatId, messageId, emoji }) {
  const db = readDb();
  const chatMsgs = db.messages[chatId] || [];
  const updatedMsgs = chatMsgs.map((m) => {
    if (m._id === messageId) {
      const currentReactions = { ...(m.reactions || {}) };
      const count = currentReactions[emoji] || 0;
      if (count > 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = 1;
      }
      return { ...m, reactions: currentReactions };
    }
    return m;
  });

  db.messages[chatId] = updatedMsgs;
  writeDb(db);
  return updatedMsgs;
}

module.exports = {
  readDb,
  loginUser,
  registerUser,
  updateUserProfile,
  searchUsers,
  getUserChats,
  saveChat,
  createGroupChat,
  getChatMessages,
  addMessage,
  toggleMessageReaction,
  fireBotUser,
};
