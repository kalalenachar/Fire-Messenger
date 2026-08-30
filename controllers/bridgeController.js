// Agni Messenger - WhatsApp & Telegram Bridge Controller
const BridgeService = require("../services/bridgeService");

// Get status of both platforms for a given user
const getPlatformsStatus = async (req, res) => {
  const { userId } = req.params;
  try {
    const whatsapp = BridgeService.getWhatsAppStatus(userId);
    const telegram = BridgeService.getTelegramStatus(userId);
    return res.json({
      success: true,
      platforms: {
        whatsapp,
        telegram,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Start WhatsApp Bridge (Generate Live QR / Pairing Code via Baileys)
const startWhatsAppBridge = async (req, res) => {
  const { userId, phone } = req.body;
  try {
    const session = await BridgeService.startWhatsAppBridge(userId, phone);
    return res.json({ success: true, session });
  } catch (error) {
    console.error("startWhatsAppBridge error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm / Check WhatsApp Connection Status
const confirmWhatsAppBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const session = BridgeService.getWhatsAppStatus(userId);
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Disconnect WhatsApp
const disconnectWhatsAppBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await BridgeService.disconnectWhatsApp(userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Start Telegram Bridge (Generate Live MTProto QR Token via GramJS)
const startTelegramBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const session = await BridgeService.startTelegramBridge(userId);
    return res.json({ success: true, session });
  } catch (error) {
    console.error("startTelegramBridge error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm / Check Telegram Connection Status
const confirmTelegramBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const session = BridgeService.getTelegramStatus(userId);
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Disconnect Telegram
const disconnectTelegramBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await BridgeService.disconnectTelegram(userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Submit Telegram 2FA Cloud Password
const submitTelegramPassword = async (req, res) => {
  const { userId, password } = req.body;
  try {
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: "User ID and password are required" });
    }
    const result = await BridgeService.submitTelegramPassword(userId, password);
    return res.json({ success: true, user: result.user, message: "Telegram connected successfully" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Fetch Synced Chats for User
const fetchSyncedBridgeChats = async (req, res) => {
  const { userId } = req.params;
  const user = req.body?.user || { _id: userId, name: "User" };
  try {
    const chats = await BridgeService.getSyncedChats(userId, user);
    return res.json({ success: true, chats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a direct chat with a phone number or contact
const createDirectBridgeChat = async (req, res) => {
  const { platform, userId, targetIdentifier, user } = req.body;
  try {
    const chat = BridgeService.createDirectChat(platform, userId, targetIdentifier, user);
    if (chat) {
      return res.json({ success: true, chat });
    }
    return res.status(400).json({ success: false, message: "Could not create direct chat" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send Message to External Bridge (WhatsApp / Telegram)
const sendBridgeMessage = async (req, res) => {
  const { platform, chatId, content, sender, mediaUrl, audioUrl, replyTo } = req.body;
  try {
    if (!platform || !chatId || (!content && !mediaUrl && !audioUrl)) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const message = await BridgeService.sendBridgeMessage(platform, {
      chatId,
      content,
      sender,
      mediaUrl,
      audioUrl,
      replyTo,
    });
    return res.json({ success: true, message });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlatformsStatus,
  startWhatsAppBridge,
  confirmWhatsAppBridge,
  disconnectWhatsAppBridge,
  startTelegramBridge,
  confirmTelegramBridge,
  disconnectTelegramBridge,
  submitTelegramPassword,
  fetchSyncedBridgeChats,
  createDirectBridgeChat,
  sendBridgeMessage,
};
