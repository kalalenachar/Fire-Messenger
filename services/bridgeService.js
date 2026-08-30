// Agni Messenger - Real Live WhatsApp (Baileys) & Telegram (MTProto) Bridge Engine
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");
const pino = require("pino");

// Ensure sessions directory exists
const SESSIONS_DIR = path.join(__dirname, "..", "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Telegram Client Config (Standard Desktop MTProto Credentials / Environment)
const TELEGRAM_API_ID = parseInt(process.env.TELEGRAM_API_ID || "2040", 10);
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || "b18441a1ff607e10a989891a5462e627";

// Active Live Sessions Map
const liveSessions = {
  whatsapp: new Map(), // userId -> { socket, authState, qrCode, qrDataUrl, status, user, chats, messages }
  telegram: new Map(), // userId -> { client, sessionString, qrCode, qrDataUrl, status, user, chats, messages }
};

class BridgeService {
  static getIo() {
    return global.io || null;
  }

  // =========================================================================
  // 🟢 REAL WHATSAPP MULTI-DEVICE BRIDGE (BAILEYS)
  // =========================================================================

  static async startWhatsAppBridge(userId, phone = null) {
    if (!userId) throw new Error("User ID is required");

    // If existing active open connection, return it
    const existing = liveSessions.whatsapp.get(userId);
    if (existing && existing.status === "connected") {
      return {
        status: "connected",
        connected: true,
        phone: existing.user?.phone,
        name: existing.user?.name,
      };
    }

    const sessionPath = path.join(SESSIONS_DIR, `whatsapp_${userId}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.macOS("Desktop"),
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
    });

    const sessionRecord = {
      socket: sock,
      status: "initializing",
      qrCode: null,
      qrDataUrl: null,
      pairingCode: null,
      user: null,
      chats: new Map(),
      messages: new Map(),
      expiresAt: Date.now() + 120000,
    };
    liveSessions.whatsapp.set(userId, sessionRecord);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const io = BridgeService.getIo();

      if (qr) {
        sessionRecord.status = "waiting_scan";
        sessionRecord.qrCode = qr;
        try {
          sessionRecord.qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, width: 260 });
        } catch (e) {
          sessionRecord.qrDataUrl = null;
        }

        if (io) {
          io.to(userId).emit("bridge_whatsapp_qr", {
            qrCode: qr,
            qrDataUrl: sessionRecord.qrDataUrl,
            pairingCode: sessionRecord.pairingCode,
          });
        }
      }

      if (connection === "open") {
        const waUser = sock.user || {};
        const formattedPhone = waUser.id ? waUser.id.split(":")[0].split("@")[0] : phone || "Connected Phone";
        sessionRecord.status = "connected";
        sessionRecord.user = {
          phone: `+${formattedPhone}`,
          name: waUser.name || "WhatsApp User",
        };
        sessionRecord.qrCode = null;
        sessionRecord.qrDataUrl = null;

        if (io) {
          io.to(userId).emit("bridge_whatsapp_connected", {
            connected: true,
            phone: sessionRecord.user.phone,
            name: sessionRecord.user.name,
          });
        }
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        sessionRecord.status = "disconnected";

        if (shouldReconnect) {
          // Reconnect automatically if network glitch
          setTimeout(() => BridgeService.startWhatsAppBridge(userId, phone), 3000);
        } else {
          // Clean up logged out session
          fs.rmSync(sessionPath, { recursive: true, force: true });
          liveSessions.whatsapp.delete(userId);
          if (io) {
            io.to(userId).emit("bridge_whatsapp_disconnected", { disconnected: true });
          }
        }
      }
    });

    // Listen for live incoming WhatsApp messages
    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;
      const io = BridgeService.getIo();

      for (const msg of m.messages) {
        if (!msg.message) continue;
        const fromJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          "";

        if (!text && !msg.message.imageMessage && !msg.message.audioMessage) continue;

        const normalizedMsg = {
          _id: `wa_${msg.key.id}`,
          content: text || (msg.message.audioMessage ? "🎤 Voice Note" : "📷 Photo"),
          chat: `wa_${fromJid}`,
          platform: "whatsapp",
          platformChatId: fromJid,
          sender: {
            _id: isFromMe ? userId : `wa_${msg.key.participant || fromJid}`,
            name: msg.pushName || (isFromMe ? "You" : "WhatsApp Contact"),
            pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          },
          deliveryStatus: isFromMe ? "delivered" : "received",
          createdAt: new Date(Number(msg.messageTimestamp) * 1000).toISOString(),
        };

        if (io) {
          io.to(userId).emit("bridge_message_received", normalizedMsg);
        }
      }
    });

    // If pairing code requested with phone number
    if (phone && !sock.authState.creds.registered) {
      try {
        const cleanNumber = phone.replace(/[^0-9]/g, "");
        const code = await sock.requestPairingCode(cleanNumber);
        sessionRecord.pairingCode = code;
      } catch (err) {
        console.warn("Could not request WA pairing code:", err.message);
      }
    }

    return {
      status: sessionRecord.status,
      qrCode: sessionRecord.qrCode,
      qrDataUrl: sessionRecord.qrDataUrl,
      pairingCode: sessionRecord.pairingCode,
      expiresAt: sessionRecord.expiresAt,
    };
  }

  static getWhatsAppStatus(userId) {
    const session = liveSessions.whatsapp.get(userId);
    if (!session) {
      // Check if saved session folder exists
      const sessionPath = path.join(SESSIONS_DIR, `whatsapp_${userId}`);
      if (fs.existsSync(sessionPath) && fs.existsSync(path.join(sessionPath, "creds.json"))) {
        return { connected: true, status: "connected", name: "WhatsApp Linked" };
      }
      return { connected: false, status: "disconnected" };
    }
    return {
      connected: session.status === "connected",
      status: session.status,
      qrCode: session.qrCode,
      qrDataUrl: session.qrDataUrl,
      pairingCode: session.pairingCode,
      phone: session.user?.phone,
      name: session.user?.name,
      expiresAt: session.expiresAt,
    };
  }

  static async disconnectWhatsApp(userId) {
    const session = liveSessions.whatsapp.get(userId);
    if (session?.socket) {
      try {
        await session.socket.logout();
      } catch (e) {}
    }
    liveSessions.whatsapp.delete(userId);
    const sessionPath = path.join(SESSIONS_DIR, `whatsapp_${userId}`);
    fs.rmSync(sessionPath, { recursive: true, force: true });
    return { success: true, platform: "whatsapp" };
  }

  // =========================================================================
  // 🔵 REAL TELEGRAM MTPROTO BRIDGE (GRAMJS)
  // =========================================================================

  static async startTelegramBridge(userId) {
    if (!userId) throw new Error("User ID is required");

    const sessionFilePath = path.join(SESSIONS_DIR, `telegram_${userId}.json`);
    let savedSessionString = "";
    if (fs.existsSync(sessionFilePath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(sessionFilePath, "utf8"));
        savedSessionString = fileContent.session || "";
      } catch (e) {}
    }

    const stringSession = new StringSession(savedSessionString);
    const client = new TelegramClient(stringSession, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
      connectionRetries: 5,
    });

    await client.connect();

    // Check if already authorized
    const isAuthorized = await client.isUserAuthorized();
    if (isAuthorized) {
      const me = await client.getMe();
      const sessionRecord = {
        client,
        status: "connected",
        user: {
          username: me.username ? `@${me.username}` : `@user_${me.id}`,
          name: `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Telegram User",
        },
      };
      liveSessions.telegram.set(userId, sessionRecord);
      return {
        status: "connected",
        connected: true,
        username: sessionRecord.user.username,
        name: sessionRecord.user.name,
      };
    }

    const sessionRecord = {
      client,
      status: "waiting_scan",
      qrCode: null,
      qrDataUrl: null,
      user: null,
      expiresAt: Date.now() + 120000,
    };
    liveSessions.telegram.set(userId, sessionRecord);

    // Request QR Code Login stream from Telegram MTProto
    client
      .signInUserWithQrCode(
        { apiId: TELEGRAM_API_ID, apiHash: TELEGRAM_API_HASH },
        {
          qrCode: async (qrToken) => {
            const rawLoginUrl = `tg://login?token=${Buffer.from(qrToken.token).toString("base64url")}`;
            sessionRecord.qrCode = rawLoginUrl;
            try {
              sessionRecord.qrDataUrl = await qrcode.toDataURL(rawLoginUrl, { margin: 2, width: 260 });
            } catch (e) {
              sessionRecord.qrDataUrl = null;
            }

            const io = BridgeService.getIo();
            if (io) {
              io.to(userId).emit("bridge_telegram_qr", {
                qrCode: rawLoginUrl,
                qrDataUrl: sessionRecord.qrDataUrl,
                expires: qrToken.expires,
              });
            }
          },
          onError: (err) => {
            console.warn("Telegram QR Error:", err.message);
          },
        }
      )
      .then(async (user) => {
        const me = user || (await client.getMe());
        sessionRecord.status = "connected";
        sessionRecord.user = {
          username: me.username ? `@${me.username}` : `@user_${me.id}`,
          name: `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Telegram User",
        };
        // Save session string
        fs.writeFileSync(
          sessionFilePath,
          JSON.stringify({ session: client.session.save(), userId, connectedAt: new Date().toISOString() })
        );

        const io = BridgeService.getIo();
        if (io) {
          io.to(userId).emit("bridge_telegram_connected", {
            connected: true,
            username: sessionRecord.user.username,
            name: sessionRecord.user.name,
          });
        }
      })
      .catch((err) => {
        console.warn("Telegram QR login ended:", err.message);
      });

    return {
      status: "waiting_scan",
      qrCode: sessionRecord.qrCode,
      qrDataUrl: sessionRecord.qrDataUrl,
      expiresAt: sessionRecord.expiresAt,
    };
  }

  static getTelegramStatus(userId) {
    const session = liveSessions.telegram.get(userId);
    if (!session) {
      const sessionFilePath = path.join(SESSIONS_DIR, `telegram_${userId}.json`);
      if (fs.existsSync(sessionFilePath)) {
        return { connected: true, status: "connected", username: "@telegram_user", name: "Telegram Linked" };
      }
      return { connected: false, status: "disconnected" };
    }
    return {
      connected: session.status === "connected",
      status: session.status,
      qrCode: session.qrCode,
      qrDataUrl: session.qrDataUrl,
      username: session.user?.username,
      name: session.user?.name,
      expiresAt: session.expiresAt,
    };
  }

  static async disconnectTelegram(userId) {
    const session = liveSessions.telegram.get(userId);
    if (session?.client) {
      try {
        await session.client.disconnect();
      } catch (e) {}
    }
    liveSessions.telegram.delete(userId);
    const sessionFilePath = path.join(SESSIONS_DIR, `telegram_${userId}.json`);
    if (fs.existsSync(sessionFilePath)) {
      fs.unlinkSync(sessionFilePath);
    }
    return { success: true, platform: "telegram" };
  }

  // =========================================================================
  // 💬 SYNCED CHATS & REAL MESSAGE DISPATCH
  // =========================================================================

  static async getSyncedChats(userId, user) {
    const waSession = liveSessions.whatsapp.get(userId);
    const tgSession = liveSessions.telegram.get(userId);
    const chats = [];

    // 1. Fetch Real WhatsApp Chats
    if (waSession && waSession.status === "connected" && waSession.socket) {
      try {
        const chatsMap = waSession.chats || new Map();
        chatsMap.forEach((c) => chats.push(c));
      } catch (e) {}
    }

    // 2. Fetch Real Telegram Dialogs
    if (tgSession && tgSession.status === "connected" && tgSession.client) {
      try {
        const dialogs = await tgSession.client.getDialogs({ limit: 15 });
        dialogs.forEach((d) => {
          const entity = d.entity || {};
          const isGroup = d.isGroup || d.isChannel;
          chats.push({
            _id: `tg_${d.id}`,
            chatName: d.title || `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || "Telegram Chat",
            isGroupChat: Boolean(isGroup),
            platform: "telegram",
            platformChatId: String(d.id),
            users: [
              user,
              {
                _id: `tg_user_${d.id}`,
                name: d.title || entity.firstName || "Telegram User",
                pic: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              },
            ],
            latestMessage: d.message?.message
              ? {
                  _id: `tg_msg_${d.message.id}`,
                  content: d.message.message,
                  sender: { _id: d.message.out ? user?._id : `tg_user_${d.id}`, name: d.message.out ? "You" : d.title },
                  platform: "telegram",
                  deliveryStatus: "delivered",
                  createdAt: new Date(d.message.date * 1000).toISOString(),
                }
              : null,
            unread: d.unreadCount || 0,
            category: isGroup ? "Groups" : "Personal",
            platformMetadata: {
              username: entity.username ? `@${entity.username}` : null,
              id: d.id,
            },
          });
        });
      } catch (e) {
        console.warn("Could not fetch Telegram dialogs:", e.message);
      }
    }

    return chats;
  }

  static async sendBridgeMessage(platform, { chatId, content, sender, mediaUrl, audioUrl, replyTo }) {
    if (platform === "whatsapp") {
      const waSession = liveSessions.whatsapp.get(sender?._id);
      if (waSession?.socket && waSession.status === "connected") {
        const cleanJid = chatId.startsWith("wa_") ? chatId.replace("wa_", "") : chatId;
        await waSession.socket.sendMessage(cleanJid, { text: content });
      }
    } else if (platform === "telegram") {
      const tgSession = liveSessions.telegram.get(sender?._id);
      if (tgSession?.client && tgSession.status === "connected") {
        const cleanPeer = chatId.startsWith("tg_") ? chatId.replace("tg_", "") : chatId;
        await tgSession.client.sendMessage(cleanPeer, { message: content });
      }
    }

    const messageId = `bridge_msg_${platform}_${Date.now()}`;
    return {
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
  }
}

module.exports = BridgeService;
