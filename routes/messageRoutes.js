const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  addMessage,
  toggleReaction,
  togglePollVote,
  addPollOption,
  updateLiveLocation,
  stopLiveLocation,
} = require("../controllers/messageController");

router.get("/:chatId", (req, res) => getChatMessages(req, res));
router.post("/", (req, res) => addMessage(req, res));
router.put("/reaction", (req, res) => toggleReaction(req, res));
router.put("/poll-vote", (req, res) => togglePollVote(req, res, req.io));
router.put("/poll-add-option", (req, res) => addPollOption(req, res, req.io));
router.put("/live-location", (req, res) => updateLiveLocation(req, res, req.io));
router.put("/stop-live-location", (req, res) => stopLiveLocation(req, res, req.io));

module.exports = router;
