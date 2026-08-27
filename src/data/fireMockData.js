// Fire Messenger Initial Mock Dataset & Bot Logic

export const defaultUser = {
  _id: "user_fire_01",
  name: "Alex Rivers",
  email: "alex@firemessenger.io",
  pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  status: "Available | 🔥 Burning with Passion",
  token: "fire_token_12345",
};

export const initialFireChats = [
  {
    _id: "chat_fire_bot",
    chatName: "Fire Bot 🔥",
    isGroupChat: false,
    users: [
      defaultUser,
      {
        _id: "bot_fire_ai",
        name: "Fire Bot 🔥",
        email: "bot@firemessenger.io",
        pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        status: "Official Automated Assistant | Online 24/7",
      },
    ],
    latestMessage: {
      content: "Welcome to Fire Messenger! Type /help or send a message to test.",
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
    groupAdmin: { _id: "user_fire_01", name: "Alex Rivers" },
    users: [
      defaultUser,
      {
        _id: "user_sarah",
        name: "Sarah Jenkins",
        pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        status: "Designing the future ✨",
      },
      {
        _id: "user_marcus",
        name: "Marcus Vance",
        pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        status: "Coding late night 💻",
      },
    ],
    latestMessage: {
      content: "The new WhatsApp emerald green UI looks incredible! 🔥",
      sender: { name: "Sarah Jenkins" },
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    unread: 3,
    pinned: true,
    category: "Groups",
  },
  {
    _id: "chat_sarah",
    chatName: "Sarah Jenkins",
    isGroupChat: false,
    users: [
      defaultUser,
      {
        _id: "user_sarah",
        name: "Sarah Jenkins",
        email: "sarah@fire.io",
        pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        status: "Designing the future ✨ | Online",
      },
    ],
    latestMessage: {
      content: "Did you review the custom theme tokens?",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    unread: 0,
    pinned: false,
    category: "Personal",
  },
  {
    _id: "chat_tech_lounge",
    chatName: "Tech Lounge & Announcements 🚀",
    isGroupChat: true,
    isChannel: true,
    users: [
      defaultUser,
      {
        _id: "user_elena",
        name: "Elena Rostova",
        pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      },
    ],
    latestMessage: {
      content: "📢 Fire Messenger v2.0 update released with WebSockets & Voice Notes!",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    unread: 0,
    pinned: false,
    category: "Channels",
  },
];

export const initialFireMessages = {
  chat_fire_bot: [
    {
      _id: "msg_bot_1",
      sender: { _id: "bot_fire_ai", name: "Fire Bot 🔥", pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
      content: "Greetings! Welcome to **Fire Messenger 🔥**.",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 360000).toISOString(),
      reactions: { "🔥": 2 },
    },
    {
      _id: "msg_bot_2",
      sender: { _id: "bot_fire_ai", name: "Fire Bot 🔥", pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
      content: "You can send text, emoji reactions, simulated voice notes, or try commands like `/help`, `/quote`, `/joke`, or `/fire`!",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 60000).toISOString(),
      reactions: { "👍": 1 },
    },
  ],
  chat_fire_squad: [
    {
      _id: "msg_squad_1",
      sender: { _id: "user_marcus", name: "Marcus Vance", pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
      content: "Hey team! Ready to launch Fire Messenger today?",
      chat: "chat_fire_squad",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      reactions: { "🚀": 3 },
    },
    {
      _id: "msg_squad_2",
      sender: { _id: "user_sarah", name: "Sarah Jenkins", pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
      content: "The new WhatsApp emerald green UI looks incredible! 🔥",
      chat: "chat_fire_squad",
      createdAt: new Date(Date.now() - 300000).toISOString(),
      reactions: { "❤️": 2, "🔥": 4 },
    },
  ],
  chat_sarah: [
    {
      _id: "msg_sarah_1",
      sender: { _id: "user_sarah", name: "Sarah Jenkins", pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
      content: "Hey Alex! Did you review the custom theme tokens?",
      chat: "chat_sarah",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  chat_tech_lounge: [
    {
      _id: "msg_tech_1",
      sender: { _id: "user_elena", name: "Elena Rostova", pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
      content: "📢 Fire Messenger v2.0 update released with WebSockets & Voice Notes!",
      chat: "chat_tech_lounge",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

export const getBotReply = (userMessage) => {
  const text = userMessage.toLowerCase().trim();

  if (text.includes("/help")) {
    return "🔥 **Fire Bot Commands**:\n- `/fire`: Receive a motivational fire quote\n- `/joke`: Get a developer joke\n- `/weather`: Instant weather report\n- `/quote`: Daily wisdom quote";
  }
  if (text.includes("/fire")) {
    return "🔥 *'Set your life on fire. Seek those who fan your flames.'* — Rumi";
  }
  if (text.includes("/joke")) {
    return "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡";
  }
  if (text.includes("/weather")) {
    return "☀️ **Fire Messenger Forecast**: 24°C, Clear Skies & High Real-time Performance!";
  }
  if (text.includes("/quote")) {
    return "✨ *'Simplicity is the soul of efficiency.'* — Austin Freeman";
  }

  const generalReplies = [
    "🔥 Fire Bot received your message loud and clear! How can I assist you further?",
    "That sounds awesome! Fire Messenger is operating at peak speed 🚀",
    "Got it! I'm here 24/7 if you need assistance or bot commands.",
    "Nice! Try clicking the emoji reactions or testing voice messages!",
  ];

  return generalReplies[Math.floor(Math.random() * generalReplies.length)];
};
