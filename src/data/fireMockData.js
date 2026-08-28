// Agni Messenger Initial Mock Dataset & Bot Logic
import axios from "axios";
import { API_BASE_URL } from "./fireStorage";

export const defaultUser = {
  _id: "user_fire_01",
  name: "Alex Rivers",
  email: "alex@agnimessenger.io",
  pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  status: "Available | 🔥 Burning with Passion",
  token: "fire_token_12345",
};

export const initialFireChats = [
  {
    _id: "chat_fire_bot",
    chatName: "Agni Bot 🔥",
    isGroupChat: false,
    users: [
      defaultUser,
      {
        _id: "bot_fire_ai",
        name: "Agni Bot 🔥",
        email: "bot@agnimessenger.io",
        pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        status: "Official Automated Assistant | Online 24/7",
      },
    ],
    latestMessage: {
      content: "Welcome to Agni Messenger! Type /help or send a message to test.",
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
        email: "sarah@agni.io",
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
      content: "📢 Agni Messenger v2.0 update released with WebSockets & Voice Notes!",
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
      sender: { _id: "bot_fire_ai", name: "Agni Bot 🔥", pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
      content: "Greetings! Welcome to **Agni Messenger 🔥**.",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 360000).toISOString(),
      reactions: { "🔥": 2 },
    },
    {
      _id: "msg_bot_2",
      sender: { _id: "bot_fire_ai", name: "Agni Bot 🔥", pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" },
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
      content: "Hey team! Ready to launch Agni Messenger today?",
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
      content: "📢 Agni Messenger v2.0 update released with WebSockets & Voice Notes!",
      chat: "chat_tech_lounge",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

export const getBotReplyAsync = async (userMessage, chatHistory = [], customApiKey = "") => {
  const text = userMessage.toLowerCase().trim();

  // Instant preset commands
  if (text === "/help") {
    return "🔥 **Agni Bot Commands & Groq AI**:\n- Ask me anything! Powered by **Groq AI** ⚡ (`llama-3.3-70b`)\n- `/fire`: Receive a motivational fire quote\n- `/joke`: Get a developer joke\n- `/weather`: Instant weather report\n- `/quote`: Daily wisdom quote";
  }
  if (text === "/fire") {
    return "🔥 *'Set your life on fire. Seek those who fan your flames.'* — Rumi";
  }
  if (text === "/joke") {
    return "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡";
  }
  if (text === "/weather") {
    return "☀️ **Agni Messenger Forecast**: 24°C, Clear Skies & Ultra-Fast Groq AI Performance!";
  }
  if (text === "/quote") {
    return "✨ *'Simplicity is the soul of efficiency.'* — Austin Freeman";
  }

  // 1. Try Express backend Groq proxy endpoint first
  try {
    const res = await axios.post(`${API_BASE_URL}/bot/chat`, {
      message: userMessage,
      history: chatHistory,
      apiKey: customApiKey || localStorage.getItem("groq_api_key") || "",
    });

    if (res.data && res.data.success && res.data.reply) {
      return res.data.reply;
    }
  } catch (backendErr) {
    console.warn("Backend Groq endpoint unavailable, trying direct client fetch:", backendErr?.message);
  }

  // 2. Direct Groq API call fallback
  const groqApiKey =
    customApiKey ||
    localStorage.getItem("groq_api_key") ||
    process.env.REACT_APP_GROQ_API_KEY ||
    process.env.GROQ_API_KEY;

  if (groqApiKey) {
    const candidateModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound-mini"];
    const formattedMessages = [
      {
        role: "system",
        content:
          "You are Agni Bot 🔥, an intelligent, energetic, and helpful AI assistant inside Agni Messenger. Provide concise, accurate, friendly responses using Markdown formatting and emojis.",
      },
      ...chatHistory.slice(-10).map((msg) => ({
        role: msg.sender?._id === "bot_fire_ai" || msg.sender?._id?.includes("bot") ? "assistant" : "user",
        content: msg.content || "",
      })),
      { role: "user", content: userMessage },
    ];

    for (const model of candidateModels) {
      try {
        const response = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: model,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 1024,
          },
          {
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const reply = response.data?.choices?.[0]?.message?.content;
        if (reply) return reply;
      } catch (directErr) {
        console.warn(`Direct Groq API error with model ${model}:`, directErr?.response?.data?.error?.message || directErr.message);
      }
    }
  }

  return "🤖 **Agni Bot AI Notice**: Please configure `GROQ_API_KEY` in your `.env` file or settings to chat with Groq AI!";
};

export const getBotReply = (userMessage) => {
  return "🔥 Thinking... (Powered by Groq AI)";
};
