const express = require("express");
const router = express.Router();
const {
  getUserChats,
  saveOrCreateChat,
} = require("../controllers/chatController");

router.get("/:userId", (req, res) => getUserChats(req, res));
router.post("/", (req, res) => saveOrCreateChat(req, res));

module.exports = router;
