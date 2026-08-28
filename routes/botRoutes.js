const express = require("express");
const router = express.Router();
const { chatWithBot } = require("../controllers/botController");

router.post("/chat", (req, res) => chatWithBot(req, res));

module.exports = router;
