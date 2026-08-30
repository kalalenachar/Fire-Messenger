// Agni Messenger Initial Mock Dataset & Bot Logic
import axios from "axios";
import { API_BASE_URL } from "./fireStorage";

export const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Agni Bot 🔥",
  username: "agni_bot",
  email: "bot@agnimessenger.io",
  pic: "https://api.dicebear.com/7.x/bottts/svg?seed=AgniBot",
  status: "Official Automated Assistant | Online 24/7",
  isBot: true,
};

export const defaultUser = {
  _id: "user_admin_root",
  name: "Administrator",
  username: "admin",
  email: "admin@agnimessenger.io",
  password: "admin123",
  pic: null,
  status: "🔥 Agni Administrator",
  token: "admin_token_12345",
  isAdmin: true,
};

export const initialFireChats = [];

export const initialFireMessages = {};

function generateClientOfflineBotReply(userMessage) {
  const text = (userMessage || "").toLowerCase().trim();

  if (text === "/help" || text.includes("help")) {
    return `🔥 **Agni Bot Commands & Capabilities**:
- **Groq AI Integration**: Ultra-fast LLM responses
- \`/fire\`: Get an energizing motivation quote
- \`/joke\`: Get a funny developer joke
- \`/weather\`: Real-time system atmospheric status
- \`/quote\`: Daily wisdom & inspiration
- \`/time\`: Current time and date
- \`/code\`: Code snippet demonstration`;
  }
  if (text === "/fire" || text.includes("fire quote")) {
    return "🔥 *'Set your life on fire. Seek those who fan your flames.'* — Rumi";
  }
  if (text === "/joke") {
    return "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡";
  }
  if (text === "/weather") {
    return "☀️ **Agni Messenger Forecast**: 24°C, Clear Skies & Ultra-Fast Real-Time Performance!";
  }
  if (text === "/quote") {
    return "✨ *'Simplicity is the soul of efficiency.'* — Austin Freeman";
  }
  if (text === "/time") {
    return `⏰ **Time**: ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}`;
  }
  if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
    return "👋 **Hello there!** How can I assist your conversation or workflow in Agni Messenger today? 🔥";
  }
  return `🔥 **Agni Bot**: I received your message: *"${userMessage}"*.\n\nI am always active to assist you! For custom answers on any topic, configure \`GROQ_API_KEY\` in \`.env\`.`;
}

export const getBotReplyAsync = async (userMessage, chatHistory = [], customApiKey = "") => {
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
    const candidateModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama3-70b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ];
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

  return generateClientOfflineBotReply(userMessage);
};

export const getBotReply = (userMessage) => {
  return generateClientOfflineBotReply(userMessage);
};
