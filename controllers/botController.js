const axios = require("axios");

// Intelligent Offline Fallback AI Processor
function generateSmartOfflineReply(message, history = []) {
  const text = (message || "").toLowerCase().trim();

  // 1. Specific Commands
  if (text === "/help" || text.includes("help") || text === "/commands") {
    return `🔥 **Agni Bot 2.0 AI Assistant & Commands**:
- **Groq AI Integration**: Ask any question for instant high-speed AI analysis.
- \`/fire\`: Get an energizing quote to inspire your day.
- \`/joke\`: Get a funny developer/tech joke.
- \`/weather\`: Current platform atmospheric and performance forecast.
- \`/quote\`: Daily wisdom and philosophy.
- \`/time\`: Current server and local time.
- \`/summarize\`: Summarize recent chat messages.
- \`/code <language>\`: Generate a clean boilerplate snippet.

*Type any general question or topic to converse with me directly!*`;
  }

  if (text === "/fire" || text.includes("motivate") || text.includes("fire quote")) {
    const quotes = [
      "🔥 *'Set your life on fire. Seek those who fan your flames.'* — Rumi",
      "⚡ *'The fire you kindle for your enemy often burns yourself more than them.'* — Chinese Proverb",
      "🔥 *'Light tomorrow with today.'* — Elizabeth Barrett Browning",
      "🚀 *'Courage is going from failure to failure without losing enthusiasm.'* — Winston Churchill",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  if (text === "/joke" || text.includes("joke") || text.includes("funny")) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡",
      "There are only 10 kinds of people in the world: those who understand binary, and those who don't. 💻",
      "A SQL query walks into a bar, walks up to two tables and asks: *'Can I join you?'* 🍺",
      "Why did the developer go broke? Because he used up all his cache! 💸",
      "How do you comfort a JavaScript bug? You console it. 🛠️",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  if (text === "/weather" || text.includes("weather")) {
    return `☀️ **Agni Global Weather Report**:
- **Status**: Clear Skies & Optimal Performance ⚡
- **Temperature**: 26°C / 78.8°F
- **Real-Time Latency**: < 15ms WebSockets Engine
- **Database Health**: 100% Operational 🔥`;
  }

  if (text === "/quote" || text.includes("wisdom")) {
    return "✨ *'Simplicity is the soul of efficiency.'* — Austin Freeman\n\nStay focused, build things with passion, and keep moving forward!";
  }

  if (text === "/time" || text.includes("what time is it") || text.includes("current time")) {
    const now = new Date();
    return `⏰ **Current Time**: ${now.toLocaleTimeString()} (${now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })})`;
  }

  if (text.startsWith("/code") || text.includes("code example")) {
    return `💻 **Agni Code Snippet Demonstration**:
\`\`\`javascript
// High-Speed WebSocket Broadcast Engine
const broadcastMessage = (io, roomId, message) => {
  if (!io || !roomId) return;
  io.to(roomId).emit("message received", {
    ...message,
    deliveredAt: new Date().toISOString(),
  });
};
\`\`\`
*Agni Messenger is engineered with React 18, Express MVC, and Socket.IO!*`;
  }

  if (text.includes("hello") || text.includes("hi") || text.includes("hey") || text.includes("greetings")) {
    return `👋 **Greetings!** I'm **Agni Bot 🔥**, your built-in AI companion. How can I assist your productivity or conversation today?`;
  }

  if (text.includes("who are you") || text.includes("what are you") || text.includes("about you")) {
    return `🔥 **About Agni Bot**:
I am the official intelligent AI assistant built natively into **Agni Messenger**.
- Fast, secure, and always accessible in your direct chats.
- Capable of helping you brainstorm, write code, answer queries, and moderate community conversations!`;
  }

  if (text.includes("telegram") || text.includes("whatsapp") || text.includes("better")) {
    return `🚀 **Why Agni Messenger leads the next generation**:
- 🔒 **True Privacy**: Built-in audience privacy profiles & disappearing messages.
- ⚡ **Instant Real-Time WebSockets**: Ultra-low latency voice notes, reactions, and live location.
- 🎨 **Dynamic Aesthetic Design**: WhatsApp Emerald & Telegram AMOLED Fire palettes with glassmorphism.
- 📞 **Crystal Clear WebRTC Calling**: Audio, video, and screen sharing built directly into your browser.`;
  }

  // General fallback response
  return `🔥 **Agni Bot AI**: Thank you for your message!
> "${message}"

I have received your request. To enable live full-scale cloud LLM reasoning with Llama 3.3 / GPT-OSS, provide your \`GROQ_API_KEY\` in the \`.env\` file or user settings. In the meantime, try \`/help\`, \`/fire\`, \`/code\`, \`/weather\`, or \`/joke\`!`;
}

// @desc    Chat with Groq AI Bot
// @route   POST /api/bot/chat
const chatWithBot = async (req, res) => {
  try {
    const { message, history = [], apiKey } = req.body;
    const groqApiKey =
      apiKey ||
      process.env.GROQ_API_KEY ||
      process.env.REACT_APP_GROQ_API_KEY;

    if (!groqApiKey) {
      const fallbackReply = generateSmartOfflineReply(message, history);
      return res.json({ success: true, reply: fallbackReply, offlineMode: true });
    }

    const formattedMessages = [
      {
        role: "system",
        content:
          "You are Agni Bot 🔥, an intelligent, energetic, and helpful AI assistant built directly into the Agni Messenger platform. " +
          "Provide concise, accurate, engaging, and friendly responses using clean Markdown formatting and expressive emojis.",
      },
      ...history.slice(-10).map((msg) => ({
        role:
          msg.sender?._id === "bot_fire_ai" ||
          msg.sender?._id?.includes("bot") ||
          msg.sender?.name?.toLowerCase().includes("bot")
            ? "assistant"
            : "user",
        content: msg.content || "",
      })),
      {
        role: "user",
        content: message,
      },
    ];

    const candidateModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama3-70b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ];
    let botReply = "";

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
            timeout: 12000,
          }
        );
        botReply = response.data?.choices?.[0]?.message?.content;
        if (botReply) break;
      } catch (modelErr) {
        console.warn(`Groq model '${model}' notice:`, modelErr?.response?.data?.error?.message || modelErr.message);
      }
    }

    if (botReply) {
      return res.json({ success: true, reply: botReply });
    } else {
      const fallbackReply = generateSmartOfflineReply(message, history);
      return res.json({ success: true, reply: fallbackReply, offlineMode: true });
    }
  } catch (err) {
    console.error("Groq API Error:", err.response?.data || err.message);
    const fallbackReply = generateSmartOfflineReply(req.body.message, req.body.history);
    res.json({ success: true, reply: fallbackReply, offlineMode: true });
  }
};

module.exports = {
  chatWithBot,
};
