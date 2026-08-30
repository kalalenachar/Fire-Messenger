// Agni Messenger - WhatsApp & Telegram Bridge Service Engine
const crypto = require("crypto");

// In-Memory active bridge sessions
const activeBridgeSessions = {
  whatsapp: new Map(), // userId -> { status, qrCode, pairingCode, user, expiresAt }
  telegram: new Map(), // userId -> { status, qrCode, loginUrl, user, expiresAt }
};

// Seed initial synced sample chats for instant preview upon linking
const generateSampleWhatsAppChats = (user) => [
  {
    _id: "bridge_wa_01",
    chatName: "Family Group 🏡",
    isGroupChat: true,
    platform: "whatsapp",
    platformChatId: "1203630248293@g.us",
    users: [
      user,
      { _id: "wa_user_mom", name: "Mom", pic: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" },
      { _id: "wa_user_dad", name: "Dad", pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    ],
    latestMessage: {
      _id: "wa_msg_01",
      content: "Don't forget family dinner this Sunday at 7 PM! 🍲",
      sender: { _id: "wa_user_mom", name: "Mom" },
      platform: "whatsapp",
      deliveryStatus: "read",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    unread: 1,
    category: "Personal",
    platformMetadata: { phone: "+1 (555) 234-5678", verified: true },
  },
  {
    _id: "bridge_wa_02",
    chatName: "David Miller",
    isGroupChat: false,
    platform: "whatsapp",
    platformChatId: "15559876543@s.whatsapp.net",
    users: [
      user,
      { _id: "wa_user_david", name: "David Miller", pic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
    ],
    latestMessage: {
      _id: "wa_msg_02",
      content: "Hey, are we still meeting for the project discussion today?",
      sender: { _id: "wa_user_david", name: "David Miller" },
      platform: "whatsapp",
      deliveryStatus: "read",
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    unread: 0,
    category: "Personal",
    platformMetadata: { phone: "+1 (555) 987-6543", verified: true },
  },
];

const generateSampleTelegramChats = (user) => [
  {
    _id: "bridge_tg_01",
    chatName: "React & Node.js Core 🚀",
    isGroupChat: true,
    platform: "telegram",
    platformChatId: "-1001489201934",
    users: [
      user,
      { _id: "tg_user_dan", name: "Dan Abramov", pic: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" },
    ],
    latestMessage: {
      _id: "tg_msg_01",
      content: "🔥 Version 2.0 release is now live with enhanced Web Audio & Omnichannel bridging!",
      sender: { _id: "tg_user_dan", name: "Dan" },
      platform: "telegram",
      deliveryStatus: "read",
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    unread: 3,
    category: "Groups",
    platformMetadata: { username: "@react_core_global", membersCount: 14200 },
  },
  {
    _id: "bridge_tg_02",
    chatName: "Elena Rostova",
    isGroupChat: false,
    platform: "telegram",
    platformChatId: "89481920",
    users: [
      user,
      { _id: "tg_user_elena", name: "Elena Rostova", pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
    ],
    latestMessage: {
      _id: "tg_msg_02",
      content: "Sent you the UI mockups on Figma. Let me know what you think!",
      sender: { _id: "tg_user_elena", name: "Elena" },
      platform: "telegram",
      deliveryStatus: "read",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    unread: 0,
    category: "Personal",
    platformMetadata: { username: "@elena_design", verified: true },
  },
];

class BridgeService {
  // --- WHATSAPP BRIDGE ---

  static generateWhatsAppQR(userId, phone = null) {
    const rawToken = crypto.randomBytes(32).toString("base64");
    const pairingCode = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sessionData = {
      status: "waiting_scan",
      qrCode: `2@${rawToken},${crypto.randomBytes(16).toString("base64")},${crypto.randomBytes(16).toString("base64")}`,
      pairingCode: phone ? pairingCode : null,
      phone: phone || "+1 (555) 789-0123",
      name: "Agni WhatsApp User",
      expiresAt: Date.now() + 60000,
    };
    activeBridgeSessions.whatsapp.set(userId, sessionData);
    return sessionData;
  }

  static getWhatsAppStatus(userId) {
    const session = activeBridgeSessions.whatsapp.get(userId);
    if (!session) {
      return { connected: false, status: "disconnected" };
    }
    return {
      connected: session.status === "connected",
      status: session.status,
      qrCode: session.qrCode,
      pairingCode: session.pairingCode,
      phone: session.phone,
      name: session.name,
      expiresAt: session.expiresAt,
    };
  }

  static completeWhatsAppConnection(userId, userDetails = {}) {
    const session = activeBridgeSessions.whatsapp.get(userId) || {};
    const updated = {
      ...session,
      status: "connected",
      connectedAt: new Date().toISOString(),
      phone: userDetails.phone || session.phone || "+1 (555) 789-0123",
      name: userDetails.name || session.name || "My WhatsApp Account",
      qrCode: null,
      pairingCode: null,
    };
    activeBridgeSessions.whatsapp.set(userId, updated);
    return updated;
  }

  static disconnectWhatsApp(userId) {
    activeBridgeSessions.whatsapp.delete(userId);
    return { success: true, platform: "whatsapp" };
  }

  // --- TELEGRAM BRIDGE ---

  static generateTelegramQR(userId) {
    const token = crypto.randomBytes(24).toString("base64url");
    const loginUrl = `tg://login?token=${token}`;
    const sessionData = {
      status: "waiting_scan",
      qrCode: loginUrl,
      loginUrl,
      username: "@agni_user",
      name: "Agni Telegram User",
      expiresAt: Date.now() + 60000,
    };
    activeBridgeSessions.telegram.set(userId, sessionData);
    return sessionData;
  }

  static getTelegramStatus(userId) {
    const session = activeBridgeSessions.telegram.get(userId);
    if (!session) {
      return { connected: false, status: "disconnected" };
    }
    return {
      connected: session.status === "connected",
      status: session.status,
      qrCode: session.qrCode,
      loginUrl: session.loginUrl,
      username: session.username,
      name: session.name,
      expiresAt: session.expiresAt,
    };
  }

  static completeTelegramConnection(userId, userDetails = {}) {
    const session = activeBridgeSessions.telegram.get(userId) || {};
    const updated = {
      ...session,
      status: "connected",
      connectedAt: new Date().toISOString(),
      username: userDetails.username || session.username || "@agni_user",
      name: userDetails.name || session.name || "My Telegram Account",
      qrCode: null,
      loginUrl: null,
    };
    activeBridgeSessions.telegram.set(userId, updated);
    return updated;
  }

  static disconnectTelegram(userId) {
    activeBridgeSessions.telegram.delete(userId);
    return { success: true, platform: "telegram" };
  }

  // --- GET SYNCED CHATS ---
  static getSyncedChats(userId, user) {
    const waStatus = this.getWhatsAppStatus(userId);
    const tgStatus = this.getTelegramStatus(userId);
    let chats = [];

    if (waStatus.connected) {
      chats = chats.concat(generateSampleWhatsAppChats(user));
    }
    if (tgStatus.connected) {
      chats = chats.concat(generateSampleTelegramChats(user));
    }
    return chats;
  }

  // --- SEND MESSAGE VIA BRIDGE ---
  static async sendBridgeMessage(platform, { chatId, content, sender, mediaUrl, audioUrl, replyTo }) {
    const messageId = `bridge_msg_${platform}_${Date.now()}`;
    const normalizedMessage = {
      _id: messageId,
      sender,
      content,
      chat: chatId,
      platform,
      platformMessageId: `${platform}_${Date.now()}`,
      mediaUrl: mediaUrl || null,
      audioUrl: audioUrl || null,
      replyTo: replyTo || null,
      deliveryStatus: "delivered",
      createdAt: new Date().toISOString(),
    };
    return normalizedMessage;
  }
}

module.exports = BridgeService;
