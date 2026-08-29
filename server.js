const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { connectDb } = require("./config/db");

// Import Route Handlers
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const folderRoutes = require("./routes/folderRoutes");
const messageRoutes = require("./routes/messageRoutes");
const statusRoutes = require("./routes/statusRoutes");
const audienceRoutes = require("./routes/audienceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const botRoutes = require("./routes/botRoutes");
const reportRoutes = require("./routes/reportRoutes");

// Import Message Controller Helpers for WebSockets
const {
  saveMessageDocument,
  deleteMessageDocument,
  toggleReactionDocument,
  togglePollVoteDocument,
  addPollOptionDocument,
  updateLiveLocationDocument,
  stopLiveLocationDocument,
} = require("./controllers/messageController");

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
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Middleware to inject Socket.IO into Express requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global exception handlers to prevent server process crashes on production
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception caught:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Promise Rejection:", reason);
});

// Initialize MongoDB on startup
connectDb().catch((err) => {
  console.error("⚠️ Initial database connection error:", err.message);
});

// --- MOUNT REST API ROUTES ---
app.use("/api/user/folders", folderRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/audience-profiles", audienceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/reports", reportRoutes);

// --- SERVE REACT FRONTEND STATIC ASSETS ---
const buildPath = path.join(__dirname, "build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send({ status: "online", message: "🔥 Agni Messenger API & MongoDB Database Server is Running!" });
  });
}

// --- SOCKET.IO REAL-TIME ENGINE ---

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
  socket.on("new message", async (newMessageReceived) => {
    try {
      await saveMessageDocument(newMessageReceived);
    } catch (err) {
      console.error("Error saving new message in DB:", err);
    }

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

  // Message Deletion & Server DB Persistence
  socket.on("delete message", async (data) => {
    try {
      await deleteMessageDocument(data);
    } catch (err) {
      console.error("Error deleting message in DB:", err);
    }
    const { chatId, messageId, deleteForEveryone, userId } = data;
    if (chatId) {
      io.in(chatId).emit("message deleted", { chatId, messageId, deleteForEveryone, userId });
    }
  });

  // Reactions & Server DB Persistence
  socket.on("toggle reaction", async (data) => {
    try {
      await toggleReactionDocument(data);
    } catch (err) {
      console.error("Error updating reaction in DB:", err);
    }
    const { chatId, messageId, emoji, userId, targetUserId } = data;
    if (targetUserId) {
      socket.in(targetUserId).emit("reaction received", { chatId, messageId, emoji, userId });
    } else if (chatId) {
      socket.in(chatId).emit("reaction received", { chatId, messageId, emoji, userId });
    }
  });

  socket.on("vote_poll", async (data) => {
    try {
      const updatedMsg = await togglePollVoteDocument(data);
      if (updatedMsg && data.chatId) {
        io.in(data.chatId).emit("poll_voted", { chatId: data.chatId, message: updatedMsg });
      }
    } catch (err) {
      console.error("Error voting on poll in DB:", err);
    }
  });

  socket.on("add_poll_option", async (data) => {
    try {
      const updatedMsg = await addPollOptionDocument(data);
      if (updatedMsg && data.chatId) {
        io.in(data.chatId).emit("poll_option_added", { chatId: data.chatId, message: updatedMsg });
      }
    } catch (err) {
      console.error("Error adding poll option in DB:", err);
    }
  });

  socket.on("update_live_location", async (data) => {
    try {
      const updatedMsg = await updateLiveLocationDocument(data);
      if (updatedMsg && data.chatId) {
        io.in(data.chatId).emit("live_location_updated", { chatId: data.chatId, message: updatedMsg });
      }
    } catch (err) {
      console.error("Error updating live location in DB:", err);
    }
  });

  socket.on("stop_live_location", async (data) => {
    try {
      const updatedMsg = await stopLiveLocationDocument(data);
      if (updatedMsg && data.chatId) {
        io.in(data.chatId).emit("live_location_stopped", { chatId: data.chatId, message: updatedMsg });
      }
    } catch (err) {
      console.error("Error stopping live location in DB:", err);
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
        fromUserId: socket.userId || caller?._id,
      });
    }
  });

  socket.on("answer-call", ({ toSocketId, toUserId, signalData }) => {
    console.log(`📞 Call answered by ${toUserId || socket.id}`);
    const payload = { signalData, fromSocketId: socket.id, fromUserId: socket.userId };
    if (toSocketId) {
      io.to(toSocketId).emit("call-accepted", payload);
    }
    if (toUserId) {
      io.to(toUserId).emit("call-accepted", payload);
    }
  });

  socket.on("ice-candidate", ({ targetUserId, toSocketId, candidate }) => {
    const payload = { candidate, fromSocketId: socket.id, fromUserId: socket.userId };
    if (toSocketId) {
      io.to(toSocketId).emit("ice-candidate", payload);
    }
    if (targetUserId) {
      io.to(targetUserId).emit("ice-candidate", payload);
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

const PORT = process.env.BACKEND_PORT || process.env.SERVER_PORT || process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 Agni Messenger Server running on http://localhost:${PORT} with MongoDB MVC Architecture!`);
});
