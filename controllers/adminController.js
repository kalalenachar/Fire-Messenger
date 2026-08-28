const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Report = require("../models/Report");
const StatusPost = require("../models/StatusPost");
const AudienceProfile = require("../models/AudienceProfile");
const UserFolder = require("../models/UserFolder");
const { fireBotUser, defaultUsersList, initialChats, initialMessages } = require("../config/db");
const { sendAdminReportAlertEmail } = require("../services/emailService");

// @desc    Get admin overview statistics
// @route   GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, verifiedUsers, pendingVerifications, bannedUsers, totalChats, totalMessages, pendingReports, totalReports] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ verificationStatus: "pending" }),
        User.countDocuments({ isBanned: true }),
        Chat.countDocuments(),
        Message.countDocuments(),
        Report.countDocuments({ status: "pending" }),
        Report.countDocuments(),
      ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        pendingVerifications,
        bannedUsers,
        totalChats,
        totalMessages,
        pendingReports,
        totalReports,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all users list
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update user admin role
// @route   PUT /api/admin/users/:userId/role
const updateUserRole = async (req, res, io) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    if (!isAdmin) {
      const targetUser = await User.findById(userId);
      if (targetUser && targetUser.isAdmin) {
        const adminCount = await User.countDocuments({ isAdmin: true });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot revoke Admin role from the last remaining Admin account! At least one admin must exist.",
          });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { isAdmin: Boolean(isAdmin) }, { returnDocument: "after" })
      .select("-password")
      .lean();

    if (io) {
      io.emit("user profile updated", updatedUser);
    }
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Toggle user ban status
// @route   PUT /api/admin/users/:userId/ban
const toggleUserBan = async (req, res, io) => {
  try {
    const { userId } = req.params;
    const { isBanned } = req.body;

    if (isBanned) {
      const targetUser = await User.findById(userId);
      if (targetUser && targetUser.isAdmin) {
        const activeAdminCount = await User.countDocuments({ isAdmin: true, isBanned: { $ne: true } });
        if (activeAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot ban the last remaining active Admin account!",
          });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { isBanned: Boolean(isBanned) }, { returnDocument: "after" })
      .select("-password")
      .lean();

    if (io) {
      io.emit("user profile updated", updatedUser);
      if (isBanned) {
        io.emit("user_banned", { userId });
      }
    }
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete user account
// @route   DELETE /api/admin/users/:userId
const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (targetUser.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last remaining Admin account! At least one admin must exist.",
        });
      }
    }

    await User.findByIdAndDelete(userId);
    res.json({ success: true, user: targetUser.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Submit content / user safety report
// @route   POST /api/reports
const submitReport = async (req, res, io) => {
  try {
    const { reporterUser, targetObj, reason, details } = req.body;
    const reportRecord = await Report.create({
      _id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reporterUser,
      targetObj,
      reason,
      details,
      status: "pending",
    });

    const reportObj = reportRecord.toObject();
    const emailResult = await sendAdminReportAlertEmail(reportObj);

    if (io) {
      io.emit("admin_new_report_alert", reportObj);
    }

    res.json({
      success: true,
      report: reportObj,
      emailSent: Boolean(emailResult?.success),
      adminEmail: process.env.ADMIN_EMAIL || "kalalenachar@gmail.com",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all safety reports
// @route   GET /api/admin/reports
const getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update report status
// @route   PUT /api/admin/reports/:reportId
const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      { status, adminNotes, reviewedAt: new Date() },
      { returnDocument: "after" }
    ).lean();
    res.json({ success: true, report: updatedReport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Dispatch system broadcast
// @route   POST /api/admin/broadcast
const sendBroadcast = async (req, res, io) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: "Broadcast content is required" });
    }

    const broadcastMessage = {
      _id: `msg_broadcast_${Date.now()}`,
      sender: fireBotUser,
      content: `📢 **AGNI SYSTEM BROADCAST** 📢\n\n${content}`,
      createdAt: new Date(),
      reactions: { "📢": 1 },
      isBroadcast: true,
    };

    const chats = await Chat.find().lean();
    const messageDocs = chats.map((c) => ({
      ...broadcastMessage,
      _id: `msg_broadcast_${c._id}_${Date.now()}`,
      chat: c._id,
    }));

    if (messageDocs.length > 0) {
      await Message.insertMany(messageDocs);
      await Chat.updateMany({}, { latestMessage: broadcastMessage, updatedAt: new Date() });
    }

    if (io) {
      io.emit("system_broadcast", broadcastMessage);
    }

    res.json({ success: true, result: { count: chats.length, broadcastMessage } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Reset database to defaults
// @route   POST /api/admin/reset-database
const resetDatabase = async (req, res) => {
  try {
    await Promise.all([
      User.deleteMany({}),
      Chat.deleteMany({}),
      Message.deleteMany({}),
      StatusPost.deleteMany({}),
      AudienceProfile.deleteMany({}),
      Report.deleteMany({}),
      UserFolder.deleteMany({}),
    ]);
    await User.insertMany(defaultUsersList);
    await Chat.insertMany(initialChats);
    await Message.insertMany(initialMessages);

    res.json({ success: true, message: "Database reset to default admin and users successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  toggleUserBan,
  deleteUserAccount,
  submitReport,
  getReports,
  updateReportStatus,
  sendBroadcast,
  resetDatabase,
};
