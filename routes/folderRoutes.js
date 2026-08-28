const express = require("express");
const router = express.Router();
const { getUserFolders, saveUserFolders } = require("../controllers/chatController");

router.get("/:userId", (req, res) => getUserFolders(req, res));
router.put("/", (req, res) => saveUserFolders(req, res, req.io));

module.exports = router;
