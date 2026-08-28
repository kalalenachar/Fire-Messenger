const express = require("express");
const router = express.Router();
const {
  getActiveStatusFeed,
  createStatusPost,
  recordStatusView,
  deleteStatusPost,
} = require("../controllers/statusController");

router.get("/feed/:userId", (req, res) => getActiveStatusFeed(req, res));
router.post("/", (req, res) => createStatusPost(req, res, req.io));
router.post("/view", (req, res) => recordStatusView(req, res, req.io));
router.delete("/:userId/:statusId", (req, res) => deleteStatusPost(req, res, req.io));

module.exports = router;
