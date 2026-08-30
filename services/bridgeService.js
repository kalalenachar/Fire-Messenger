// Agni Messenger - Real Live WhatsApp (Baileys) & Telegram (MTProto) Bridge Engine
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
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

// Profile picture caches to avoid rate limits
const profilePicCache = new Map();

class BridgeService {
  static getIo() {
    return global.io || null;
  }

  // Helper to format WhatsApp JID
  static formatWhatsAppJid(target) {
    if (!target) return "";
    let clean = String(target).replace(/^wa_/, "").trim();
    if (clean.includes("@")) return clean;
    const digits = clean.replace(/[^0-9]/g, "");
    return `${digits}@s.whatsapp.net`;
  }

  // Helper to fetch live WhatsApp profile picture
  static async fetchWhatsAppProfilePic(sock, jid) {
    if (!sock || !jid) return null;
    const cleanJid = BridgeService.formatWhatsAppJid(jid);
    if (profilePicCache.has(cleanJid)) {
      return profilePicCache.get(cleanJid);
    }
    try {
      const url = await sock.profilePictureUrl(cleanJid, "image");
      if (url) {
        profilePicCache.set(cleanJid, url);
        return url;
      }
    } catch (e) {
      // User has privacy enabled or no profile picture set
    }
    profilePicCache.set(cleanJid, null);
    return null;
  }

  // Helper to fetch live Telegram profile picture
  static async fetchTelegramProfilePic(client, peer) {
    if (!client || !peer) return null;
    const cacheKey = `tg_${peer}`;
    if (profilePicCache.has(cacheKey)) {
      return profilePicCache.get(cacheKey);
    }
    try {
      const buffer = await client.downloadProfilePhoto(peer, { isBig: false });
      if (buffer && buffer.length > 0) {
        const dataUrl = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
        profilePicCache.set(cacheKey, dataUrl);
        return dataUrl;
      }
    } catch (e) {}
    profilePicCache.set(cacheKey, null);
    return null;
  }

  // =========================================================================
  // 🟢 REAL WHATSAPP MULTI-DEVICE BRIDGE (BAILEYS)
  // =========================================================================

  static async startWhatsAppBridge(userId, phone = null) {
    if (!userId) throw new Error("User ID is required");

    const existing = liveSessions.whatsapp.get(userId);
    if (existing && existing.status === "connected" && existing.socket) {
      return {
        status: "connected",
        connected: true,
        phone: existing.user?.phone || "Active",
        name: existing.user?.name || "WhatsApp User",
        pic: existing.user?.pic || null,
      };
    }

    if (existing?.socket) {
      try {
        existing.socket.ev.removeAllListeners();
        existing.socket.end(undefined);
      } catch (e) {}
    }

    const sessionPath = path.join(SESSIONS_DIR, `whatsapp_${userId}`);
    const logger = pino({ level: "silent" });
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ["Agni Messenger", "Chrome", "120.0.0.0"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
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

    let onQrReceivedCallback = null;

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

        console.log(`🟢 WhatsApp QR Code generated for user: ${userId}`);

        if (io) {
          io.to(userId).emit("bridge_whatsapp_qr", {
            qrCode: qr,
            qrDataUrl: sessionRecord.qrDataUrl,
            pairingCode: sessionRecord.pairingCode,
          });
        }

        if (onQrReceivedCallback) {
          onQrReceivedCallback();
          onQrReceivedCallback = null;
        }
      }

      if (connection === "open") {
        const waUser = sock.user || {};
        const formattedPhone = waUser.id ? waUser.id.split(":")[0].split("@")[0] : phone || "Connected";
        
        let myPic = null;
        if (waUser.id) {
          myPic = await BridgeService.fetchWhatsAppProfilePic(sock, waUser.id).catch(() => null);
        }

        sessionRecord.status = "connected";
        sessionRecord.user = {
          phone: `+${formattedPhone}`,
          name: waUser.name || "WhatsApp User",
          pic: myPic || null,
        };
        sessionRecord.qrCode = null;
        sessionRecord.qrDataUrl = null;

        console.log(`🎉 🟢 WhatsApp linked for user: ${userId} (${sessionRecord.user.phone}, pic: ${!!myPic})`);

        if (io) {
          io.to(userId).emit("bridge_whatsapp_connected", {
            connected: true,
            phone: sessionRecord.user.phone,
            name: sessionRecord.user.name,
            pic: sessionRecord.user.pic,
          });
        }

        if (onQrReceivedCallback) {
          onQrReceivedCallback();
          onQrReceivedCallback = null;
        }
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ WhatsApp connection closed (code: ${statusCode}, reconnect: ${shouldReconnect})`);

        sessionRecord.status = "disconnected";

        if (shouldReconnect) {
          setTimeout(() => BridgeService.startWhatsAppBridge(userId, phone), 3000);
        } else {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          liveSessions.whatsapp.delete(userId);
          if (io) {
            io.to(userId).emit("bridge_whatsapp_disconnected", { disconnected: true });
          }
        }
      }
    });

    // Handle incoming history sync
    sock.ev.on("messaging-history.set", async ({ chats }) => {
      if (!chats) return;
      console.log(`📥 Syncing ${chats.length} WhatsApp chats from history...`);
      for (const c of chats) {
        if (!c.id || c.id === "status@broadcast") continue;
        const isGroup = c.id.endsWith("@g.us");
        const cleanPhone = c.id.split("@")[0];
        const chatName = c.name || (isGroup ? "WhatsApp Group" : `+${cleanPhone}`);
        
        let pic = null;
        try {
          pic = await BridgeService.fetchWhatsAppProfilePic(sock, c.id);
        } catch (e) {}

        sessionRecord.chats.set(c.id, {
          _id: `wa_${c.id}`,
          chatName,
          isGroupChat: isGroup,
          platform: "whatsapp",
          platformChatId: c.id,
          pic: pic || null,
          users: [
            { _id: userId, name: "You" },
            {
              _id: `wa_${c.id}`,
              name: chatName,
              pic: pic || null,
            },
          ],
          unread: c.unreadCount || 0,
          category: isGroup ? "Groups" : "Personal",
          platformMetadata: { phone: `+${cleanPhone}` },
        });
      }
    });

    sock.ev.on("chats.upsert", async (newChats) => {
      for (const c of newChats) {
        if (!c.id || c.id === "status@broadcast") continue;
        const isGroup = c.id.endsWith("@g.us");
        const cleanPhone = c.id.split("@")[0];
        const chatName = c.name || (isGroup ? "WhatsApp Group" : `+${cleanPhone}`);
        
        let pic = null;
        try {
          pic = await BridgeService.fetchWhatsAppProfilePic(sock, c.id);
        } catch (e) {}

        sessionRecord.chats.set(c.id, {
          _id: `wa_${c.id}`,
          chatName,
          isGroupChat: isGroup,
          platform: "whatsapp",
          platformChatId: c.id,
          pic: pic || null,
          users: [
            { _id: userId, name: "You" },
            {
              _id: `wa_${c.id}`,
              name: chatName,
              pic: pic || null,
            },
          ],
          unread: c.unreadCount || 0,
          category: isGroup ? "Groups" : "Personal",
          platformMetadata: { phone: `+${cleanPhone}` },
        });
      }
    });

    // Listen for live incoming WhatsApp messages
    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;
      const io = BridgeService.getIo();

      for (const msg of m.messages) {
        if (!msg.message) continue;
        const fromJid = msg.key.remoteJid;
        if (!fromJid || fromJid === "status@broadcast") continue;
        const isFromMe = msg.key.fromMe;
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          "";

        if (!text && !msg.message.imageMessage && !msg.message.audioMessage) continue;

        const isGroup = fromJid.endsWith("@g.us");
        const cleanPhone = fromJid.split("@")[0];
        const contactName = msg.pushName || (isGroup ? "WhatsApp Group" : `+${cleanPhone}`);

        // Fetch contact live WhatsApp profile picture
        let senderPic = null;
        if (!isFromMe) {
          senderPic = await BridgeService.fetchWhatsAppProfilePic(sock, msg.key.participant || fromJid).catch(() => null);
        } else {
          senderPic = sessionRecord.user?.pic || null;
        }

        const normalizedMsg = {
          _id: `wa_${msg.key.id}`,
          content: text || (msg.message.audioMessage ? "🎤 Voice Note" : "📷 Photo"),
          chat: `wa_${fromJid}`,
          platform: "whatsapp",
          platformChatId: fromJid,
          sender: {
            _id: isFromMe ? userId : `wa_${msg.key.participant || fromJid}`,
            name: isFromMe ? "You" : contactName,
            pic: senderPic || null,
          },
          deliveryStatus: isFromMe ? "delivered" : "received",
          createdAt: new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
        };

        let chatObj = sessionRecord.chats.get(fromJid);
        if (!chatObj) {
          chatObj = {
            _id: `wa_${fromJid}`,
            chatName: contactName,
            isGroupChat: isGroup,
            platform: "whatsapp",
            platformChatId: fromJid,
            pic: senderPic || null,
            users: [
              { _id: userId, name: "You" },
              {
                _id: `wa_${fromJid}`,
                name: contactName,
                pic: senderPic || null,
              },
            ],
            latestMessage: normalizedMsg,
            unread: isFromMe ? 0 : 1,
            category: isGroup ? "Groups" : "Personal",
            platformMetadata: { phone: `+${cleanPhone}` },
          };
          sessionRecord.chats.set(fromJid, chatObj);
        } else {
          chatObj.latestMessage = normalizedMsg;
          if (senderPic) chatObj.pic = senderPic;
          if (!isFromMe) chatObj.unread = (chatObj.unread || 0) + 1;
        }

        console.log(`💬 Live WhatsApp message from ${fromJid}: ${normalizedMsg.content} (pic: ${!!senderPic})`);

        if (io) {
          io.to(userId).emit("bridge_message_received", {
            platform: "whatsapp",
            chat: chatObj,
            message: normalizedMsg,
          });
        }
      }
    });

    // Wait up to 3.5 seconds for QR to generate before returning response
    await new Promise((resolve) => {
      onQrReceivedCallback = resolve;
      setTimeout(resolve, 3500);
    });

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
      const sessionPath = path.join(SESSIONS_DIR, `whatsapp_${userId}`);
      if (fs.existsSync(sessionPath)) {
        try {
          const credsFile = path.join(sessionPath, "creds.json");
          if (fs.existsSync(credsFile)) {
            const creds = JSON.parse(fs.readFileSync(credsFile, "utf8"));
            if (creds.registered && creds.me) {
              const formatted = creds.me.id ? creds.me.id.split(":")[0].split("@")[0] : "Active";
              return { connected: true, status: "connected", phone: `+${formatted}`, name: creds.me.name || "WhatsApp Account", pic: null };
            }
          }
        } catch (e) {}
      }
      return { connected: false, status: "disconnected" };
    }

    const isConnected = session.status === "connected";
    return {
      connected: isConnected,
      status: session.status,
      qrCode: isConnected ? null : session.qrCode,
      qrDataUrl: isConnected ? null : session.qrDataUrl,
      pairingCode: session.pairingCode,
      phone: session.user?.phone,
      name: session.user?.name,
      pic: session.user?.pic || null,
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
    console.log(`🔌 WhatsApp disconnected for user: ${userId}`);
    return { success: true, platform: "whatsapp" };
  }

  // =========================================================================
  // 🔵 REAL TELEGRAM MTPROTO BRIDGE (GRAMJS)
  // =========================================================================

  static async startTelegramBridge(userId) {
    if (!userId) throw new Error("User ID is required");

    const existing = liveSessions.telegram.get(userId);
    if (existing && existing.status === "connected" && existing.client) {
      return {
        status: "connected",
        connected: true,
        username: existing.user?.username || "@user",
        name: existing.user?.name || "Telegram User",
        pic: existing.user?.pic || null,
      };
    }

    if (existing?.client) {
      try {
        await existing.client.disconnect();
      } catch (e) {}
    }

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

    const isAuthorized = await client.isUserAuthorized().catch(() => false);
    if (isAuthorized) {
      const me = await client.getMe();
      let myPic = await BridgeService.fetchTelegramProfilePic(client, "me").catch(() => null);
      const sessionRecord = {
        client,
        status: "connected",
        user: {
          username: me.username ? `@${me.username}` : `@user_${me.id}`,
          name: `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Telegram User",
          pic: myPic || null,
        },
      };
      liveSessions.telegram.set(userId, sessionRecord);
      return {
        status: "connected",
        connected: true,
        username: sessionRecord.user.username,
        name: sessionRecord.user.name,
        pic: sessionRecord.user.pic,
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

    let onTgQrReceived = null;

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

            console.log(`🔵 Telegram MTProto QR generated for user: ${userId}`);

            const io = BridgeService.getIo();
            if (io) {
              io.to(userId).emit("bridge_telegram_qr", {
                qrCode: rawLoginUrl,
                qrDataUrl: sessionRecord.qrDataUrl,
                expires: qrToken.expires,
              });
            }

            if (onTgQrReceived) {
              onTgQrReceived();
              onTgQrReceived = null;
            }
          },
          onError: (err) => {
            console.warn("Telegram QR Error:", err.message);
          },
        }
      )
      .then(async (user) => {
        const me = user || (await client.getMe());
        const myPic = await BridgeService.fetchTelegramProfilePic(client, "me").catch(() => null);
        sessionRecord.status = "connected";
        sessionRecord.user = {
          username: me.username ? `@${me.username}` : `@user_${me.id}`,
          name: `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Telegram User",
          pic: myPic || null,
        };
        fs.writeFileSync(
          sessionFilePath,
          JSON.stringify({ session: client.session.save(), userId, connectedAt: new Date().toISOString() })
        );

        console.log(`🎉 🔵 Telegram linked for user: ${userId} (${sessionRecord.user.username})`);

        const io = BridgeService.getIo();
        if (io) {
          io.to(userId).emit("bridge_telegram_connected", {
            connected: true,
            username: sessionRecord.user.username,
            name: sessionRecord.user.name,
            pic: sessionRecord.user.pic,
          });
        }
      })
      .catch((err) => {
        console.warn("Telegram QR login finished:", err.message);
      });

    // Wait up to 3.5 seconds for Telegram QR token
    await new Promise((resolve) => {
      onTgQrReceived = resolve;
      setTimeout(resolve, 3500);
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
        try {
          const fileContent = JSON.parse(fs.readFileSync(sessionFilePath, "utf8"));
          if (fileContent.session) {
            return { connected: true, status: "connected", username: "@telegram_user", name: "Telegram Linked", pic: null };
          }
        } catch (e) {}
      }
      return { connected: false, status: "disconnected" };
    }

    const isConnected = session.status === "connected";
    return {
      connected: isConnected,
      status: session.status,
      qrCode: isConnected ? null : session.qrCode,
      qrDataUrl: isConnected ? null : session.qrDataUrl,
      username: session.user?.username,
      name: session.user?.name,
      pic: session.user?.pic || null,
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
    console.log(`🔌 Telegram disconnected for user: ${userId}`);
    return { success: true, platform: "telegram" };
  }

  // =========================================================================
  // 💬 SYNCED CHATS & REAL MESSAGE DISPATCH
  // =========================================================================

  static async getSyncedChats(userId, user) {
    // If WhatsApp has saved auth folder but no active in-memory socket, trigger connect
    if (!liveSessions.whatsapp.has(userId)) {
      const sessionPath = path.join(SESSIONS_DIR, `whatsapp_${userId}`);
      if (fs.existsSync(path.join(sessionPath, "creds.json"))) {
        BridgeService.startWhatsAppBridge(userId).catch(() => {});
      }
    }

    const waSession = liveSessions.whatsapp.get(userId);
    const tgSession = liveSessions.telegram.get(userId);
    const chats = [];

    // 1. Return all active WhatsApp chats
    if (waSession) {
      const chatsMap = waSession.chats || new Map();
      chatsMap.forEach((c) => chats.push(c));
    }

    // 2. Fetch Real Telegram Dialogs
    if (tgSession && tgSession.status === "connected" && tgSession.client) {
      try {
        const dialogs = await tgSession.client.getDialogs({ limit: 20 });
        for (const d of dialogs) {
          const entity = d.entity || {};
          const isGroup = d.isGroup || d.isChannel;
          const photoUrl = await BridgeService.fetchTelegramProfilePic(tgSession.client, d.inputEntity).catch(() => null);

          chats.push({
            _id: `tg_${d.id}`,
            chatName: d.title || `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || "Telegram Chat",
            isGroupChat: Boolean(isGroup),
            platform: "telegram",
            platformChatId: String(d.id),
            pic: photoUrl || null,
            users: [
              user,
              {
                _id: `tg_user_${d.id}`,
                name: d.title || entity.firstName || "Telegram User",
                pic: photoUrl || null,
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
        }
      } catch (e) {
        console.warn("Could not fetch Telegram dialogs:", e.message);
      }
    }

    return chats;
  }

  // Create a brand new direct chat thread with a phone number / username
  static async createDirectChat(platform, userId, targetIdentifier, user) {
    if (platform === "whatsapp") {
      const waSession = liveSessions.whatsapp.get(userId);
      const jid = BridgeService.formatWhatsAppJid(targetIdentifier);
      const cleanPhone = jid.split("@")[0];

      let pic = null;
      if (waSession?.socket) {
        pic = await BridgeService.fetchWhatsAppProfilePic(waSession.socket, jid).catch(() => null);
      }

      const chatObj = {
        _id: `wa_${jid}`,
        chatName: `+${cleanPhone}`,
        isGroupChat: false,
        platform: "whatsapp",
        platformChatId: jid,
        pic: pic || null,
        users: [
          user || { _id: userId, name: "You" },
          {
            _id: `wa_${jid}`,
            name: `+${cleanPhone}`,
            pic: pic || null,
          },
        ],
        unread: 0,
        category: "Personal",
        platformMetadata: { phone: `+${cleanPhone}` },
      };
      if (waSession) {
        waSession.chats.set(jid, chatObj);
      }
      return chatObj;
    }
    return null;
  }

  static async sendBridgeMessage(platform, { chatId, content, sender, mediaUrl, audioUrl, replyTo }) {
    if (platform === "whatsapp") {
      const waSession = liveSessions.whatsapp.get(sender?._id);
      if (waSession?.socket && waSession.status === "connected") {
        const jid = BridgeService.formatWhatsAppJid(chatId);
        console.log(`📤 Dispatching live WhatsApp message to JID ${jid}: "${content}"`);
        await waSession.socket.sendMessage(jid, { text: content });
      }
    } else if (platform === "telegram") {
      const tgSession = liveSessions.telegram.get(sender?._id);
      if (tgSession?.client && tgSession.status === "connected") {
        const cleanPeer = chatId.startsWith("tg_") ? chatId.replace("tg_", "") : chatId;
        console.log(`📤 Dispatching live Telegram message to ${cleanPeer}: "${content}"`);
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
