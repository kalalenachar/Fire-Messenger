// Fire Messenger - Real Persistent Data Layer & Live Cross-Tab Synchronization Engine

const USERS_KEY = "fire_messenger_users_db";
const CHATS_KEY = "fire_messenger_chats_db";
const MESSAGES_KEY = "fire_messenger_messages_db";
const CURRENT_USER_KEY = "userInfo";

export const defaultUsersList = [
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

export const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Fire Bot 🔥",
  email: "bot@firemessenger.io",
  pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  status: "Official Automated Assistant | Online 24/7",
};

// Seed default users into local storage if not present
export const getRegisteredUsers = () => {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsersList));
    return defaultUsersList;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultUsersList;
  }
};

export const saveRegisteredUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// User Registration
export const registerUser = ({ name, email, password, pic, status }) => {
  const users = getRegisteredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    throw new Error("An account with this email address already exists.");
  }

  const newUser = {
    _id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    pic: pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    status: status || "Available | 🔥 Fire Messenger",
    token: `token_${Date.now()}`,
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Return clean user profile without password
  const { password: _, ...cleanUser } = newUser;
  return cleanUser;
};

// User Login
export const loginUser = (email, password) => {
  const users = getRegisteredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    throw new Error("No account found with this email address.");
  }
  if (user.password !== password) {
    throw new Error("Invalid password. Please check your credentials.");
  }

  const { password: _, ...cleanUser } = user;
  return cleanUser;
};

// Update Profile
export const updateUserProfileInDb = (userId, updates) => {
  const users = getRegisteredUsers();
  const updatedUsers = users.map((u) => (u._id === userId ? { ...u, ...updates } : u));
  saveRegisteredUsers(updatedUsers);

  // Update current user session if applicable
  const current = getCurrentSessionUser();
  if (current && current._id === userId) {
    const updatedSession = { ...current, ...updates };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedSession));
  }
};

// Session Management
export const getCurrentSessionUser = () => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const setCurrentSessionUser = (user) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const clearCurrentSession = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Initial Seed Chats
export const getInitialChatsForUser = (user) => {
  const allUsers = getRegisteredUsers();
  const sarah = allUsers.find((u) => u._id === "user_sarah") || defaultUsersList[1];
  const marcus = allUsers.find((u) => u._id === "user_marcus") || defaultUsersList[2];

  return [
    {
      _id: "chat_fire_bot",
      chatName: "Fire Bot 🔥",
      isGroupChat: false,
      users: [user, fireBotUser],
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
      groupAdmin: user,
      users: [user, sarah, marcus],
      latestMessage: {
        content: "Welcome to the team! Real-time messaging is live 🔥",
        sender: sarah,
        createdAt: new Date(Date.now() - 300000).toISOString(),
      },
      unread: 2,
      pinned: true,
      category: "Groups",
    },
    {
      _id: `chat_sarah_${user._id}`,
      chatName: "Sarah Jenkins",
      isGroupChat: false,
      users: [user, sarah],
      latestMessage: {
        content: "Hey! Ready to test real-time chat?",
        sender: sarah,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      unread: 0,
      pinned: false,
      category: "Personal",
    },
  ];
};

export const getInitialMessagesForUser = (user) => {
  return {
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
        sender: { _id: "user_marcus", name: "Marcus Vance", pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
        content: "Hey team! Fire Messenger real registration system is officially online!",
        chat: "chat_fire_squad",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        reactions: { "🚀": 3 },
      },
      {
        _id: "msg_squad_2",
        sender: { _id: "user_sarah", name: "Sarah Jenkins", pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
        content: "Welcome to the team! Real-time messaging is live 🔥",
        chat: "chat_fire_squad",
        createdAt: new Date(Date.now() - 300000).toISOString(),
        reactions: { "❤️": 2, "🔥": 4 },
      },
    ],
  };
};

// Storage Helpers for Chats & Messages
export const getStoredChats = (userId) => {
  const key = `${CHATS_KEY}_${userId}`;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const saveStoredChats = (userId, chats) => {
  const key = `${CHATS_KEY}_${userId}`;
  localStorage.setItem(key, JSON.stringify(chats));
};

export const getStoredMessagesMap = (userId) => {
  const key = `${MESSAGES_KEY}_${userId}`;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const saveStoredMessagesMap = (userId, messagesMap) => {
  const key = `${MESSAGES_KEY}_${userId}`;
  localStorage.setItem(key, JSON.stringify(messagesMap));
};

// Live Broadcast Sync Channel Across Tabs
let broadcastChannel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  broadcastChannel = new BroadcastChannel("fire_messenger_live_channel");
}

export const notifySyncEvent = (type, payload) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
  }
};

export const subscribeSyncEvent = (callback) => {
  if (!broadcastChannel) return () => {};
  const handler = (event) => {
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };
  broadcastChannel.addEventListener("message", handler);
  return () => {
    broadcastChannel.removeEventListener("message", handler);
  };
};
