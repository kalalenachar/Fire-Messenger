const express = require("express");
const router = express.Router();
const {
  getAudienceProfiles,
  saveAudienceProfile,
  deleteAudienceProfile,
} = require("../controllers/statusController");

router.get("/:userId", (req, res) => getAudienceProfiles(req, res));
router.post("/", (req, res) => saveAudienceProfile(req, res));
router.delete("/:userId/:profileId", (req, res) => deleteAudienceProfile(req, res));

module.exports = router;
