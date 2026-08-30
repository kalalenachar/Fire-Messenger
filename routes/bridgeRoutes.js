// Agni Messenger - WhatsApp & Telegram Bridge Routes
const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/bridgeController");

// Status
router.get("/status/:userId", getPlatformsStatus);

// WhatsApp
router.post("/whatsapp/start", startWhatsAppBridge);
router.post("/whatsapp/confirm", confirmWhatsAppBridge);
router.post("/whatsapp/disconnect", disconnectWhatsAppBridge);

// Telegram
router.post("/telegram/start", startTelegramBridge);
router.post("/telegram/confirm", confirmTelegramBridge);
router.post("/telegram/disconnect", disconnectTelegramBridge);
router.post("/telegram/password", submitTelegramPassword);

// Chats & Messaging
router.all("/chats/:userId", fetchSyncedBridgeChats);
router.post("/create-chat", createDirectBridgeChat);
router.post("/send", sendBridgeMessage);

module.exports = router;
