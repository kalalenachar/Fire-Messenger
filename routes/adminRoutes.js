const express = require("express");
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  toggleUserBan,
  deleteUserAccount,
  getReports,
  updateReportStatus,
  sendBroadcast,
  resetDatabase,
} = require("../controllers/adminController");
const User = require("../models/User");

router.get("/stats", (req, res) => getAdminStats(req, res));
router.get("/users", (req, res) => getAllUsers(req, res));
router.put("/users/:userId/role", (req, res) => updateUserRole(req, res, req.io));
router.put("/users/:userId/ban", (req, res) => toggleUserBan(req, res, req.io));
router.delete("/users/:userId", (req, res) => deleteUserAccount(req, res));
router.get("/reports", (req, res) => getReports(req, res));
router.put("/reports/:reportId", (req, res) => updateReportStatus(req, res));
router.post("/broadcast", (req, res) => sendBroadcast(req, res, req.io));
router.post("/reset-database", (req, res) => resetDatabase(req, res));

// Admin Verifications
router.get("/verifications", async (req, res) => {
  try {
    const users = await User.find({
      verificationStatus: { $exists: true, $ne: "none" },
    })
      .select("-password")
      .lean();
    res.json({ success: true, verifications: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
