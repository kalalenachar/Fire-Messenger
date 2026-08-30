const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  addMessage,
  deleteMessage,
  toggleReaction,
  togglePollVote,
  addPollOption,
  updateLiveLocation,
  stopLiveLocation,
  editMessage,
  toggleStarMessage,
  pinChatMessage,
  unpinChatMessage,
  forwardMessages,
  setChatDisappearingTimer,
} = require("../controllers/messageController");

router.get("/:chatId", (req, res) => getChatMessages(req, res));
router.post("/", (req, res) => addMessage(req, res));
router.put("/edit", (req, res) => editMessage(req, res, req.io));
router.put("/star", (req, res) => toggleStarMessage(req, res, req.io));
router.put("/pin", (req, res) => pinChatMessage(req, res, req.io));
router.put("/unpin", (req, res) => unpinChatMessage(req, res, req.io));
router.post("/forward", (req, res) => forwardMessages(req, res, req.io));
router.put("/disappearing-timer", (req, res) => setChatDisappearingTimer(req, res, req.io));
router.delete("/:messageId", (req, res) => deleteMessage(req, res, req.io));
router.post("/delete", (req, res) => deleteMessage(req, res, req.io));
router.put("/reaction", (req, res) => toggleReaction(req, res));
router.put("/poll-vote", (req, res) => togglePollVote(req, res, req.io));
router.put("/poll-add-option", (req, res) => addPollOption(req, res, req.io));
router.put("/live-location", (req, res) => updateLiveLocation(req, res, req.io));
router.put("/stop-live-location", (req, res) => stopLiveLocation(req, res, req.io));

module.exports = router;
