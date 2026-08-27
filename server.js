// Fire Messenger Real-Time Socket.IO Server & WebRTC Signaling Backend
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send({ status: "online", message: "🔥 Fire Messenger Real-Time API & Signaling Server is Running!" });
});

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

  socket.on("join chat", (room) => {
    if (!room) return;
    socket.join(room);
    console.log("⚡ User joined socket room:", room);
  });

  // Typing Events
  socket.on("typing", ({ room, user }) => {
    socket.in(room).emit("typing", { room, user });
  });

  socket.on("stop typing", ({ room, user }) => {
    socket.in(room).emit("stop typing", { room, user });
  });

  // Message Sending
  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived.chatObj || newMessageReceived.chat;
    if (!chat) return;

    // Send to recipient user rooms if users list is present
    if (typeof chat === "object" && Array.isArray(chat.users)) {
      chat.users.forEach((u) => {
        if (u._id === newMessageReceived.sender._id) return;
        socket.in(u._id).emit("message received", newMessageReceived);
      });
    }

    // Also broadcast to room ID
    const roomId = typeof chat === "string" ? chat : chat._id;
    if (roomId) {
      socket.in(roomId).emit("message received", newMessageReceived);
    }
  });

  // Reactions
  socket.on("toggle reaction", (data) => {
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
  console.log(`🔥 Fire Messenger Socket.IO & Signaling Server running on port ${PORT}`);
});

