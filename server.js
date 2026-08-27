// Fire Messenger Real-Time Socket.IO Server, REST API & Persistent Database Backend
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./serverDb");

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

  // WebRTC Audio & Video Call Signaling
  socket.on("call-user", ({ targetUserId, signalData, caller, callType, chatId }) => {
    console.log(`📞 Call initiated from ${caller.name} to ${targetUserId} (${callType})`);
    socket.in(targetUserId).emit("incoming-call", {
      caller,
      signalData,
      callType,
      chatId,
      fromSocketId: socket.id,
    });
  });

  socket.on("answer-call", ({ toSocketId, toUserId, signalData }) => {
    console.log(`📞 Call answered by ${toUserId || socket.id}`);
    if (toSocketId) {
      socket.in(toSocketId).emit("call-accepted", { signalData, fromSocketId: socket.id });
    } else if (toUserId) {
      socket.in(toUserId).emit("call-accepted", { signalData, fromSocketId: socket.id });
    }
  });

  socket.on("ice-candidate", ({ targetUserId, candidate }) => {
    if (targetUserId) {
      socket.in(targetUserId).emit("ice-candidate", { candidate, fromSocketId: socket.id });
    }
  });

  socket.on("reject-call", ({ targetUserId, toSocketId }) => {
    if (toSocketId) {
      socket.in(toSocketId).emit("call-rejected");
    } else if (targetUserId) {
      socket.in(targetUserId).emit("call-rejected");
    }
  });

  socket.on("end-call", ({ targetUserId, toSocketId }) => {
    if (toSocketId) {
      socket.in(toSocketId).emit("call-ended");
    } else if (targetUserId) {
      socket.in(targetUserId).emit("call-ended");
    }
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


