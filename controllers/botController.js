const axios = require("axios");

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
      return res.status(400).json({
        success: false,
        message: "Groq API key is missing. Please set GROQ_API_KEY in .env file or settings.",
      });
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

    const candidateModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound-mini"];
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
            timeout: 15000,
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
      throw new Error("No response returned from Groq API");
    }
  } catch (err) {
    console.error("Groq API Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.error?.message || err.message || "Failed to fetch response from Groq API.",
    });
  }
};

module.exports = {
  chatWithBot,
};
