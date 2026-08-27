const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const axios = require("axios");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const db = require("./serverDb");

// Load environment variables from .env if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  maxHttpBufferSize: 1e8, // 100MB for voice notes & attachments
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"],
  },
});

// Initialize database on startup
db.readDb();

app.get("/", (req, res) => {
  res.send({ status: "online", message: "🔥 Fire Messenger Real-Time API & Persistent DB Server is Running!" });
});

// --- REST API ENDPOINTS ---

// Auth - Login
app.post("/api/user/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.loginUser(email, password);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Auth - Signup
app.post("/api/user/signup", (req, res) => {
  try {
    const user = db.registerUser(req.body);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update Profile
app.put("/api/user/profile", (req, res) => {
  try {
    const { userId, updates } = req.body;
    const updatedUser = db.updateUserProfile(userId, updates);
    if (updatedUser) {
      io.emit("user profile updated", updatedUser);
    }
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Search Users
app.get("/api/user/search", (req, res) => {
  try {
    const { search, userId } = req.query;
    const users = db.searchUsers(search || "", userId || "");
    res.json({ success: true, users });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Fetch User Chats
app.get("/api/chats/:userId", (req, res) => {
  try {
    const chats = db.getUserChats(req.params.userId);
    res.json({ success: true, chats });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Fetch User Folders
app.get("/api/user/folders/:userId", (req, res) => {
  try {
    const folders = db.getUserFolders(req.params.userId);
    res.json({ success: true, folders });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Save/Update User Folders
app.put("/api/user/folders", (req, res) => {
  try {
    const { userId, folders } = req.body;
    const updatedFolders = db.saveUserFolders(userId, folders);
    io.emit("folders updated", { userId, folders: updatedFolders });
    res.json({ success: true, folders: updatedFolders });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


// Save or Create Chat
app.post("/api/chats", (req, res) => {
  try {
    if (req.body.isGroupChat) {
      const groupChat = db.createGroupChat(req.body);
      res.json({ success: true, chat: groupChat });
    } else {
      const saved = db.saveChat(req.body.chat);
      res.json({ success: true, chat: saved });
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Fetch Messages for a Chat
app.get("/api/messages/:chatId", (req, res) => {
  try {
    const messages = db.getChatMessages(req.params.chatId);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Send/Save Message
app.post("/api/messages", (req, res) => {
  try {
    const message = db.addMessage(req.body);
    res.json({ success: true, message });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Toggle Reaction
app.put("/api/messages/reaction", (req, res) => {
  try {
    const updatedMsgs = db.toggleMessageReaction(req.body);
    res.json({ success: true, messages: updatedMsgs });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Vote on Poll
app.put("/api/messages/poll-vote", (req, res) => {
  try {
    const updatedMsg = db.togglePollVote(req.body);
    if (updatedMsg) {
      io.in(req.body.chatId).emit("poll_voted", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Add Option to Poll
app.put("/api/messages/poll-add-option", (req, res) => {
  try {
    const updatedMsg = db.addPollOption(req.body);
    if (updatedMsg) {
      io.in(req.body.chatId).emit("poll_option_added", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update Live Location
app.put("/api/messages/live-location", (req, res) => {
  try {
    const updatedMsg = db.updateLiveLocation(req.body);
    if (updatedMsg) {
      io.in(req.body.chatId).emit("live_location_updated", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Stop Live Location
app.put("/api/messages/stop-live-location", (req, res) => {
  try {
    const updatedMsg = db.stopLiveLocation(req.body);
    if (updatedMsg) {
      io.in(req.body.chatId).emit("live_location_stopped", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// --- ADMIN EMAIL NOTIFICATIONS & REPORTS ---
async function sendAdminReportAlertEmail(reportData) {
  const adminEmail = process.env.ADMIN_EMAIL || "kalalenachar@gmail.com";
  console.log(`📧 Dispatching Instant Admin Email Alert to: ${adminEmail}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  const reporterName = reportData.reporterUser?.name || reportData.reporterUser?.email || "User";
  const reporterEmail = reportData.reporterUser?.email || "Unknown Email";
  const targetTitle = reportData.targetObj?.name || reportData.targetObj?.chatName || reportData.targetObj?._id || "Target";
  const targetType = reportData.targetObj?.isGroupChat ? "Group Chat" : reportData.targetObj?.name ? "User Profile" : "Message / Conversation";
  const reasonText = reportData.reason || "Unspecified Reason";
  const detailsText = reportData.details ? reportData.details : "No additional comments provided.";
  const timestamp = new Date(reportData.createdAt || Date.now()).toLocaleString();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">🚨 URGENT: Fire Messenger Safety Report</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">High Priority Moderation Alert for Admin Review</p>
      </div>

      <div style="padding: 24px; color: #333333; font-size: 14px; line-height: 1.6;">
        <p style="font-size: 15px; font-weight: bold; color: #111827; margin-top: 0;">
          Attention Admin,
        </p>
        <p>A new user/content report was submitted on <strong>Fire Messenger</strong> and requires your immediate attention to react:</p>

        <div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px; color: #64748b;">Reported By:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${reporterName} (${reporterEmail})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #64748b;">Target Item:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${targetTitle} (${targetType})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #64748b;">Report Category:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #e11d48;">⚠️ ${reasonText}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #64748b;">Date & Time:</td>
              <td style="padding: 6px 0; color: #475569;">${timestamp}</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 14px; color: #0f172a; margin-bottom: 6px;">Reporter's Additional Comments:</h3>
        <blockquote style="margin: 0; padding: 12px 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; font-style: italic; color: #9f1239;">
          "${detailsText}"
        </blockquote>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <div style="text-align: center;">
          <a href="http://localhost:3000" style="display: inline-block; background: #00a884; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; font-size: 14px;">
            Open Fire Messenger Admin Portal
          </a>
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
        Fire Messenger Real-Time Automated Safety System &bull; Admin Instant Alert Service
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Fire Messenger Safety" <no-reply@firemessenger.io>`,
      to: adminEmail,
      subject: `🚨 [URGENT REPORT] ${reasonText} reported by ${reporterName}`,
      text: `Urgent Report Alert:\n\nReporter: ${reporterName} (${reporterEmail})\nTarget: ${targetTitle}\nReason: ${reasonText}\nComments: ${detailsText}\nTime: ${timestamp}`,
      html: htmlContent,
    });
    console.log(`✅ Admin Instant Email Alert successfully dispatched to ${adminEmail}! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.warn(`⚠️ Primary SMTP send notice: ${error.message}. Generating test server preview...`);
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const testInfo = await testTransporter.sendMail({
        from: `"Fire Messenger Safety" <no-reply@firemessenger.io>`,
        to: adminEmail,
        subject: `🚨 [URGENT REPORT] ${reasonText} reported by ${reporterName}`,
        html: htmlContent,
      });
      console.log(`✅ Admin Instant Email Alert preview generated! Preview URL: ${nodemailer.getTestMessageUrl(testInfo)}`);
      return { success: true, previewUrl: nodemailer.getTestMessageUrl(testInfo) };
    } catch (e) {
      console.error("Could not send email alert:", e);
      return { success: false, error: e.message };
    }
  }
}

app.post("/api/reports", async (req, res) => {
  try {
    const { reporterUser, targetObj, reason, details } = req.body;
    const reportRecord = db.saveReport({ reporterUser, targetObj, reason, details });

    // Send instant email notification to admin
    const emailResult = await sendAdminReportAlertEmail(reportRecord);

    // Emit live WebSocket alert to any online admin clients
    io.emit("admin_new_report_alert", reportRecord);

    res.json({
      success: true,
      report: reportRecord,
      emailSent: Boolean(emailResult?.success),
      adminEmail: process.env.ADMIN_EMAIL || "kalalenachar@gmail.com",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// --- GROQ AI BOT ENDPOINT ---
app.post("/api/bot/chat", async (req, res) => {
  try {
    const { message, history = [], apiKey } = req.body;
    const groqApiKey =
      apiKey ||
      process.env.GROQ_API_KEY ||
      process.env.REACT_APP_GROQ_API_KEY ||
      "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";

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
          "You are Fire Bot 🔥, an intelligent, energetic, and helpful AI assistant built directly into the Fire Messenger platform. " +
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
        console.warn(`Groq model '${model}' failed, trying next model:`, modelErr?.response?.data?.error?.message || modelErr.message);
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
});

// --- STATUS & AUDIENCE PROFILE REST ENDPOINTS ---


// Get Status Feed for User
app.get("/api/status/feed/:userId", (req, res) => {
  try {
    const feed = db.getActiveStatusFeed(req.params.userId);
    res.json({ success: true, feed });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Create New Status Post
app.post("/api/status", (req, res) => {
  try {
    const { userId, postData } = req.body;
    const newPost = db.createStatusPost(userId, postData);
    io.emit("new_status_posted", { userId, post: newPost });
    res.json({ success: true, post: newPost });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Record Status View
app.post("/api/status/view", (req, res) => {
  try {
    const { statusId, viewerUser } = req.body;
    const updatedPost = db.recordStatusView(statusId, viewerUser);
    if (updatedPost) {
      io.emit("status_viewed", { statusId, viewerUser, viewers: updatedPost.viewers, authorId: updatedPost.userId });
    }
    res.json({ success: true, post: updatedPost });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete Status Post
app.delete("/api/status/:userId/:statusId", (req, res) => {
  try {
    const { userId, statusId } = req.params;
    const success = db.deleteStatusPost(userId, statusId);
    if (success) {
      io.emit("status_deleted", { userId, statusId });
    }
    res.json({ success });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get Audience Profiles for User
app.get("/api/audience-profiles/:userId", (req, res) => {
  try {
    const profiles = db.getAudienceProfiles(req.params.userId);
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Save / Create / Edit Audience Profile
app.post("/api/audience-profiles", (req, res) => {
  try {
    const { userId, profileData } = req.body;
    const profile = db.saveAudienceProfile(userId, profileData);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete Audience Profile
app.delete("/api/audience-profiles/:userId/:profileId", (req, res) => {
  try {
    const { userId, profileId } = req.params;
    const success = db.deleteAudienceProfile(userId, profileId);
    res.json({ success });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// --- SOCKET.IO REAL-TIME ENGINE ---

// Active online users mapping: userId -> socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ New client connected to Socket.IO:", socket.id);

  // Setup user session
  socket.on("setup", (userData) => {
    if (!userData || !userData._id) return;
    socket.join(userData._id);
    onlineUsers.set(userData._id, socket.id);
    socket.userId = userData._id;
    socket.emit("connected");
    io.emit("user presence", { userId: userData._id, status: "online" });
  });

  socket.on("update user profile", (updatedUser) => {
    if (!updatedUser || !updatedUser._id) return;
    socket.broadcast.emit("user profile updated", updatedUser);
  });

  socket.on("join chat", (room) => {
    if (!room) return;
    socket.join(room);
  });

  // Typing Events
  socket.on("typing", ({ room, user }) => {
    socket.in(room).emit("typing", { room, user });
  });

  socket.on("stop typing", ({ room, user }) => {
    socket.in(room).emit("stop typing", { room, user });
  });

  // Message Sending & Server DB Persistence
  socket.on("new message", (newMessageReceived) => {
    db.addMessage(newMessageReceived);

    const chat = newMessageReceived.chatObj || newMessageReceived.chat;
    if (!chat) return;

    if (typeof chat === "object" && Array.isArray(chat.users)) {
      chat.users.forEach((u) => {
        if (u._id === newMessageReceived.sender._id) return;
        socket.in(u._id).emit("message received", newMessageReceived);
      });
    }

    const roomId = typeof chat === "string" ? chat : chat._id;
    if (roomId) {
      socket.in(roomId).emit("message received", newMessageReceived);
    }
  });

  // Reactions & Server DB Persistence
  socket.on("toggle reaction", (data) => {
    db.toggleMessageReaction(data);
    const { chatId, messageId, emoji, userId, targetUserId } = data;
    if (targetUserId) {
      socket.in(targetUserId).emit("reaction received", { chatId, messageId, emoji, userId });
    } else if (chatId) {
      socket.in(chatId).emit("reaction received", { chatId, messageId, emoji, userId });
    }
  });

  socket.on("vote_poll", (data) => {
    const updatedMsg = db.togglePollVote(data);
    if (updatedMsg && data.chatId) {
      io.in(data.chatId).emit("poll_voted", { chatId: data.chatId, message: updatedMsg });
    }
  });

  socket.on("add_poll_option", (data) => {
    const updatedMsg = db.addPollOption(data);
    if (updatedMsg && data.chatId) {
      io.in(data.chatId).emit("poll_option_added", { chatId: data.chatId, message: updatedMsg });
    }
  });

  socket.on("update_live_location", (data) => {
    const updatedMsg = db.updateLiveLocation(data);
    if (updatedMsg && data.chatId) {
      io.in(data.chatId).emit("live_location_updated", { chatId: data.chatId, message: updatedMsg });
    }
  });

  socket.on("stop_live_location", (data) => {
    const updatedMsg = db.stopLiveLocation(data);
    if (updatedMsg && data.chatId) {
      io.in(data.chatId).emit("live_location_stopped", { chatId: data.chatId, message: updatedMsg });
    }
  });


  // WebRTC Audio & Video Call Signaling
  socket.on("call-user", ({ targetUserId, signalData, caller, callType, chatId }) => {
    console.log(`📞 Call initiated from ${caller?.name || "User"} to ${targetUserId} (${callType})`);
    if (targetUserId) {
      io.to(targetUserId).emit("incoming-call", {
        caller,
        signalData,
        callType,
        chatId,
        fromSocketId: socket.id,
      });
    }
  });

  socket.on("answer-call", ({ toSocketId, toUserId, signalData }) => {
    console.log(`📞 Call answered by ${toUserId || socket.id}`);
    if (toSocketId) {
      io.to(toSocketId).emit("call-accepted", { signalData, fromSocketId: socket.id });
    }
    if (toUserId) {
      io.to(toUserId).emit("call-accepted", { signalData, fromSocketId: socket.id });
    }
  });

  socket.on("ice-candidate", ({ targetUserId, candidate }) => {
    if (targetUserId) {
      io.to(targetUserId).emit("ice-candidate", { candidate, fromSocketId: socket.id });
    }
  });

  socket.on("reject-call", ({ targetUserId, toSocketId }) => {
    if (toSocketId) io.to(toSocketId).emit("call-rejected");
    if (targetUserId) io.to(targetUserId).emit("call-rejected");
  });

  socket.on("end-call", ({ targetUserId, toSocketId }) => {
    if (toSocketId) io.to(toSocketId).emit("call-ended");
    if (targetUserId) io.to(targetUserId).emit("call-ended");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("user presence", { userId: socket.userId, status: "offline" });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 Fire Messenger Server running on http://localhost:${PORT} with Persistent JSON Database!`);
});


