// Agni Messenger - WhatsApp & Telegram Bridge Controller
const BridgeService = require("../services/bridgeService");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

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

// Start WhatsApp Bridge (Generate QR / Pairing Code)
const startWhatsAppBridge = async (req, res) => {
  const { userId, phone } = req.body;
  try {
    const session = BridgeService.generateWhatsAppQR(userId, phone);
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm / Complete WhatsApp Connection (Simulate Scan or Authenticate)
const confirmWhatsAppBridge = async (req, res) => {
  const { userId, phone, name } = req.body;
  try {
    const session = BridgeService.completeWhatsAppConnection(userId, { phone, name });
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Disconnect WhatsApp
const disconnectWhatsAppBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const result = BridgeService.disconnectWhatsApp(userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Start Telegram Bridge (Generate QR Login Token)
const startTelegramBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const session = BridgeService.generateTelegramQR(userId);
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm / Complete Telegram Connection
const confirmTelegramBridge = async (req, res) => {
  const { userId, username, name } = req.body;
  try {
    const session = BridgeService.completeTelegramConnection(userId, { username, name });
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Disconnect Telegram
const disconnectTelegramBridge = async (req, res) => {
  const { userId } = req.body;
  try {
    const result = BridgeService.disconnectTelegram(userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch Synced Chats for User
const fetchSyncedBridgeChats = async (req, res) => {
  const { userId } = req.params;
  const user = req.body?.user || { _id: userId, name: "User" };
  try {
    const chats = BridgeService.getSyncedChats(userId, user);
    return res.json({ success: true, chats });
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
  fetchSyncedBridgeChats,
  sendBridgeMessage,
};
